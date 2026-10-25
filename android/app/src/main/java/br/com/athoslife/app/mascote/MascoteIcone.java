package br.com.athoslife.app.mascote;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import java.util.Calendar;

/**
 * Núcleo da troca de ícone no Android.
 *
 * Guarda o horário de sono e a conquista do dia, calcula qual ícone deve aparecer
 * e agenda a próxima troca (início do sono, fim do sono ou meia-noite).
 * Cada estado é um activity-alias no AndroidManifest; trocar o ícone é ligar
 * o alias do estado novo e desligar os outros.
 */
public final class MascoteIcone {

    public enum Estado { NORMAL, CONQUISTA, SONO }

    static final String TAG = "MascoteIcone";
    static final String ACAO_ALARME = "br.com.athoslife.app.ATUALIZAR_ICONE";

    /** Nomes dos activity-alias no AndroidManifest, na ordem de {@link Estado}. */
    private static final String[] ALIAS = { "IconeNormal", "IconeConquista", "IconeSono" };

    private static final String PREFS = "mascote_icone";
    private static final String K_SONO_INICIO = "sono_inicio";
    private static final String K_SONO_FIM = "sono_fim";
    private static final String K_CONQUISTA_ATE = "conquista_ate";

    /**
     * true enquanto o app está na tela. Trocar o ícone nesse momento pode fechar o app,
     * então a troca fica para quando ele sair da tela.
     */
    static volatile boolean emPrimeiroPlano = false;

    private MascoteIcone() {}

    // ------------------------------------------------------------------ dados

    /** inicio/fim em minutos desde a meia-noite (-1 = sem horário de sono). conquistaAte em ms (0 = sem conquista). */
    static void salvar(Context c, int inicio, int fim, long conquistaAte) {
        if (!minutoValido(inicio) || !minutoValido(fim)) {
            inicio = -1;
            fim = -1;
        }
        prefs(c).edit()
                .putInt(K_SONO_INICIO, inicio)
                .putInt(K_SONO_FIM, fim)
                .putLong(K_CONQUISTA_ATE, Math.max(0L, conquistaAte))
                .apply();
    }

    static Estado estadoAtual(Context c) {
        SharedPreferences p = prefs(c);
        return calcular(p.getInt(K_SONO_INICIO, -1), p.getInt(K_SONO_FIM, -1),
                p.getLong(K_CONQUISTA_ATE, 0L), Calendar.getInstance());
    }

    // ----------------------------------------------------------------- regras

    static Estado calcular(int inicio, int fim, long conquistaAte, Calendar agora) {
        if (temSono(inicio, fim)) {
            int t = agora.get(Calendar.HOUR_OF_DAY) * 60 + agora.get(Calendar.MINUTE);
            boolean dormindo = inicio < fim ? (t >= inicio && t < fim) : (t >= inicio || t < fim);
            if (dormindo) return Estado.SONO;
        }
        if (agora.getTimeInMillis() < conquistaAte) return Estado.CONQUISTA;
        return Estado.NORMAL;
    }

    /** Próximo instante em que o estado pode mudar, ou -1 se nada está agendado. */
    static long proximaTroca(int inicio, int fim, long conquistaAte, Calendar agora) {
        long proxima = Long.MAX_VALUE;
        if (temSono(inicio, fim)) {
            proxima = Math.min(proxima, proximaOcorrencia(inicio, agora));
            proxima = Math.min(proxima, proximaOcorrencia(fim, agora));
        }
        if (conquistaAte > agora.getTimeInMillis()) proxima = Math.min(proxima, conquistaAte);
        return proxima == Long.MAX_VALUE ? -1L : proxima;
    }

    private static long proximaOcorrencia(int minutos, Calendar agora) {
        Calendar c = (Calendar) agora.clone();
        c.set(Calendar.HOUR_OF_DAY, minutos / 60);
        c.set(Calendar.MINUTE, minutos % 60);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= agora.getTimeInMillis()) c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    private static boolean temSono(int inicio, int fim) {
        return minutoValido(inicio) && minutoValido(fim) && inicio != fim;
    }

    private static boolean minutoValido(int m) {
        return m >= 0 && m < 24 * 60;
    }

    // ------------------------------------------------------------ troca do ícone

    /** Troca para o ícone do estado atual, a menos que o app esteja na tela. */
    static void aplicarSePossivel(Context c) {
        if (emPrimeiroPlano) return; // o plugin aplica quando o app sair da tela
        aplicar(c, estadoAtual(c));
    }

    static void aplicar(Context c, Estado estado) {
        PackageManager pm = c.getPackageManager();
        String[] nomes = nomesDosAlias(c);
        int alvo = estado.ordinal();
        try {
            // 1) Liga o novo primeiro: o app nunca fica sem ícone.
            definir(pm, new ComponentName(c.getPackageName(), nomes[alvo]), true);
            // 2) Desliga os outros.
            for (int i = 0; i < nomes.length; i++) {
                if (i != alvo) definir(pm, new ComponentName(c.getPackageName(), nomes[i]), false);
            }
        } catch (IllegalArgumentException e) {
            Log.e(TAG, "activity-alias não encontrado no AndroidManifest: " + e.getMessage());
        }
    }

    private static void definir(PackageManager pm, ComponentName comp, boolean ligado) {
        int desejado = ligado
                ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
        if (pm.getComponentEnabledSetting(comp) != desejado) {
            pm.setComponentEnabledSetting(comp, desejado, PackageManager.DONT_KILL_APP);
        }
    }

    /**
     * Nome completo de cada alias. O ".IconeNormal" do manifest é relativo ao namespace
     * do projeto, que pode ser diferente do applicationId, então procuramos o nome real.
     */
    private static String[] nomesDosAlias(Context c) {
        String[] nomes = new String[ALIAS.length];
        try {
            int flags = PackageManager.GET_ACTIVITIES | PackageManager.MATCH_DISABLED_COMPONENTS;
            PackageInfo info = c.getPackageManager().getPackageInfo(c.getPackageName(), flags);
            if (info.activities != null) {
                for (ActivityInfo a : info.activities) {
                    for (int i = 0; i < ALIAS.length; i++) {
                        if (a.name.endsWith("." + ALIAS[i])) nomes[i] = a.name;
                    }
                }
            }
        } catch (PackageManager.NameNotFoundException ignorado) {
            // cai no padrão abaixo
        }
        for (int i = 0; i < nomes.length; i++) {
            if (nomes[i] == null) nomes[i] = c.getPackageName() + "." + ALIAS[i];
        }
        return nomes;
    }

    // ---------------------------------------------------------------- agenda

    /** Agenda o alarme da próxima troca (ou cancela, se não houver nada a trocar). */
    static void agendar(Context c) {
        SharedPreferences p = prefs(c);
        long quando = proximaTroca(p.getInt(K_SONO_INICIO, -1), p.getInt(K_SONO_FIM, -1),
                p.getLong(K_CONQUISTA_ATE, 0L), Calendar.getInstance());

        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent intent = new Intent(c, MascoteIconeReceiver.class).setAction(ACAO_ALARME);
        PendingIntent pi = PendingIntent.getBroadcast(c, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        if (quando > 0) {
            // Alarme inexato: não precisa da permissão de alarme exato e funciona com o
            // celular em repouso. Pode atrasar alguns minutos, o que não importa para um ícone.
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando + 1000L, pi);
        }
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
