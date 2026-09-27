package br.com.athoslife.app.liveactivity;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.Locale;

import br.com.athoslife.app.MainActivity;
import br.com.athoslife.app.R;

/**
 * Desenha a Live Activity do treino: notificação fixa, com layout próprio,
 * visível na tela de bloqueio. A contagem do descanso/cronômetro é um
 * Chronometer em modo regressivo — anda sozinho, sem o app acordado.
 */
final class LiveActivityNotificacao {
    static final String CANAL = "athos_treino_ativo";
    static final int ID = 910_002;

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());
    private static Runnable fimAgendado;

    private LiveActivityNotificacao() {
    }

    static void mostrar(Context ctx) {
        EstadoLive e = EstadoLive.carregar(ctx);
        if (e == null) return;
        if (e.avancarRelogio(System.currentTimeMillis())) e.salvar(ctx);

        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (!nm.areNotificationsEnabled()) return;
        criarCanal(ctx);

        RemoteViews pequeno = new RemoteViews(ctx.getPackageName(), R.layout.athos_la_pequeno);
        RemoteViews grande = new RemoteViews(ctx.getPackageName(), R.layout.athos_la_grande);
        preencherPequeno(ctx, pequeno, e);
        preencherGrande(ctx, grande, e);

        Intent abrir = new Intent(ctx, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent aoTocar = PendingIntent.getActivity(
                ctx, 0, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANAL)
                .setSmallIcon(R.drawable.ic_stat_athos)
                .setColor(ContextCompat.getColor(ctx, R.color.athos_la_lima))
                .setContentTitle(e.nome())
                .setContentText("Série " + e.serieAtual() + " de " + e.totalSeries())
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(pequeno)
                .setCustomBigContentView(grande)
                .setContentIntent(aoTocar)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        try {
            nm.notify(ID, b.build());
        } catch (SecurityException semPermissao) {
            return;
        }
        agendarFim(ctx, e);
    }

    static void encerrar(Context ctx) {
        cancelarFim();
        EstadoLive.limpar(ctx);
        NotificationManagerCompat.from(ctx).cancel(ID);
    }

    // ── preenchimento ───────────────────────────────────────────────────────

    private static void preencherPequeno(Context ctx, RemoteViews v, EstadoLive e) {
        String status = e.status();
        v.setTextViewText(R.id.la_nome, e.nome());
        v.setTextViewText(R.id.la_serie, "Série " + e.serieAtual() + "/" + e.totalSeries());
        v.setTextColor(R.id.la_ponto, cor(ctx, "descanso".equals(status) ? R.color.athos_la_descanso : R.color.athos_la_lima));
        boolean contando = e.fimEm() > 0 && !"serie".equals(status);
        if (contando) {
            v.setViewVisibility(R.id.la_relogio, View.VISIBLE);
            v.setViewVisibility(R.id.la_resumo, View.GONE);
            configurarRelogio(ctx, v, e, status);
        } else {
            v.setViewVisibility(R.id.la_relogio, View.GONE);
            v.setViewVisibility(R.id.la_resumo, View.VISIBLE);
            v.setTextViewText(R.id.la_resumo, e.porTempo() ? formatarRelogio(e.segundos()) : formatarCarga(e.carga()) + " × " + e.reps());
        }
    }

    private static void preencherGrande(Context ctx, RemoteViews v, EstadoLive e) {
        String status = e.status();
        v.setTextViewText(R.id.la_nome, e.nome());
        v.setTextViewText(R.id.la_serie, "Série " + e.serieAtual() + " de " + e.totalSeries());
        v.setTextColor(R.id.la_ponto, cor(ctx, "descanso".equals(status) ? R.color.athos_la_descanso : R.color.athos_la_lima));

        if ("serie".equals(status)) {
            v.setViewVisibility(R.id.la_bloco_serie, View.VISIBLE);
            v.setViewVisibility(R.id.la_bloco_tempo, View.GONE);
            v.setTextViewText(R.id.la_rotulo_a, "peso (kg)");
            v.setTextViewText(R.id.la_valor_a, formatarCarga(e.carga()));
            clique(ctx, v, R.id.la_a_menos, "carga-");
            clique(ctx, v, R.id.la_a_mais, "carga+");
            if (e.porTempo()) {
                v.setTextViewText(R.id.la_rotulo_b, "tempo");
                v.setTextViewText(R.id.la_valor_b, formatarRelogio(e.segundos()));
                clique(ctx, v, R.id.la_b_menos, "seg-");
                clique(ctx, v, R.id.la_b_mais, "seg+");
                v.setTextViewText(R.id.la_principal, "Iniciar cronômetro ▶");
                clique(ctx, v, R.id.la_principal, "iniciar");
            } else {
                v.setTextViewText(R.id.la_rotulo_b, "reps");
                v.setTextViewText(R.id.la_valor_b, String.valueOf(e.reps()));
                clique(ctx, v, R.id.la_b_menos, "reps-");
                clique(ctx, v, R.id.la_b_mais, "reps+");
                v.setTextViewText(R.id.la_principal, "Confirmar série ✓");
                clique(ctx, v, R.id.la_principal, "confirmar");
            }
            return;
        }

        v.setViewVisibility(R.id.la_bloco_serie, View.GONE);
        v.setViewVisibility(R.id.la_bloco_tempo, View.VISIBLE);
        configurarRelogio(ctx, v, e, status);

        if ("descanso".equals(status)) {
            String proximo = e.proximo();
            v.setTextViewText(R.id.la_rotulo_relogio,
                    proximo != null ? "descanso · próximo: " + proximo : "descanso até a próxima série");
            v.setViewVisibility(R.id.la_btn_esq, View.VISIBLE);
            v.setTextViewText(R.id.la_btn_esq, "+15s");
            clique(ctx, v, R.id.la_btn_esq, "descanso+15");
            v.setTextViewText(R.id.la_btn_dir, "Pular");
            v.setInt(R.id.la_btn_dir, "setBackgroundResource", R.drawable.athos_la_botao_descanso);
            v.setTextColor(R.id.la_btn_dir, 0xFF2A1608);
            clique(ctx, v, R.id.la_btn_dir, "pular");
        } else {
            v.setTextViewText(R.id.la_rotulo_relogio, "segura firme — conta sozinho");
            v.setViewVisibility(R.id.la_btn_esq, View.GONE);
            v.setTextViewText(R.id.la_btn_dir, "Concluir agora");
            v.setInt(R.id.la_btn_dir, "setBackgroundResource", R.drawable.athos_la_botao_lima);
            v.setTextColor(R.id.la_btn_dir, cor(ctx, R.color.athos_la_escuro));
            clique(ctx, v, R.id.la_btn_dir, "confirmar");
        }
    }

    /** Chronometer regressivo: a base é o término convertido pro relógio do sistema. */
    private static void configurarRelogio(Context ctx, RemoteViews v, EstadoLive e, String status) {
        long restante = Math.max(0, e.fimEm() - System.currentTimeMillis());
        long base = SystemClock.elapsedRealtime() + restante;
        v.setChronometer(R.id.la_relogio, base, null, true);
        v.setChronometerCountDown(R.id.la_relogio, true);
        v.setTextColor(R.id.la_relogio, cor(ctx, "descanso".equals(status) ? R.color.athos_la_descanso : R.color.athos_la_lima));
    }

    private static void clique(Context ctx, RemoteViews v, int viewId, String acao) {
        Intent it = new Intent(ctx, LiveActivityReceiver.class)
                .setAction(LiveActivityReceiver.ACAO_BOTAO)
                .putExtra(LiveActivityReceiver.EXTRA_ACAO, acao);
        // requestCode único por ação: senão o Android reaproveita o mesmo PendingIntent.
        PendingIntent pi = PendingIntent.getBroadcast(
                ctx, acao.hashCode(), it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(viewId, pi);
    }

    // ── fim do relógio com o app dormindo ───────────────────────────────────

    /**
     * Quando o descanso/cronômetro acaba, redesenha o card (senão o relógio
     * passaria de zero). Só vale enquanto o processo existe; o aviso sonoro
     * de fim vem do LocalNotifications agendado pelo app.
     */
    private static void agendarFim(Context ctx, EstadoLive e) {
        cancelarFim();
        long fim = e.fimEm();
        if (fim <= 0 || "serie".equals(e.status())) return;
        final Context app = ctx.getApplicationContext();
        fimAgendado = () -> mostrar(app);
        HANDLER.postDelayed(fimAgendado, Math.max(0, fim - System.currentTimeMillis()) + 300);
    }

    private static void cancelarFim() {
        if (fimAgendado != null) HANDLER.removeCallbacks(fimAgendado);
        fimAgendado = null;
    }

    // ── utilitários ─────────────────────────────────────────────────────────

    private static void criarCanal(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel canal = new NotificationChannel(
                CANAL, "Treino em andamento", NotificationManager.IMPORTANCE_DEFAULT);
        canal.setDescription("Série, descanso e cronômetro do treino na tela de bloqueio");
        canal.setSound(null, null);
        canal.enableVibration(false);
        canal.setShowBadge(false);
        canal.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(canal);
    }

    private static int cor(Context ctx, int res) {
        return ContextCompat.getColor(ctx, res);
    }

    private static String formatarCarga(Double kg) {
        if (kg == null) return "—";
        if (kg == Math.floor(kg)) return String.valueOf(kg.intValue());
        return String.format(Locale.ROOT, "%.1f", kg).replace('.', ',');
    }

    private static String formatarRelogio(int segundos) {
        return String.format(Locale.ROOT, "%02d:%02d", segundos / 60, segundos % 60);
    }
}
