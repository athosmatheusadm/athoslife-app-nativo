package br.com.athoslife.app.liveactivity;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.RelativeSizeSpan;
import android.util.TypedValue;
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
 * Quando o descanso/cronômetro acaba, um alarme do sistema redesenha o card
 * (vira a próxima série) mesmo que o Android tenha fechado o app.
 */
final class LiveActivityNotificacao {
    static final String CANAL = "athos_treino_ativo";
    static final int ID = 910_002;

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());
    private static Runnable redesenho;

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
        long agora = System.currentTimeMillis();
        PendingIntent aoTocar = abrirApp(ctx);
        preencherPequeno(ctx, pequeno, e, agora);
        preencherGrande(ctx, grande, e, agora, aoTocar);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANAL)
                .setSmallIcon(R.drawable.ic_stat_athos)
                .setColor(ContextCompat.getColor(ctx, R.color.athos_la_lima))
                .setContentTitle(e.concluida() ? ctx.getString(R.string.la_concluido) : e.nome())
                .setContentText(subtitulo(ctx, e))
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

        // Android 12+ sempre põe a moldura do sistema; antes dele, a moldura
        // só encolhia o card do mockup (dono, 30/10: "dentro de outro quadrado").
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            b.setStyle(new NotificationCompat.DecoratedCustomViewStyle());
        }

        try {
            nm.notify(ID, b.build());
        } catch (SecurityException semPermissao) {
            return;
        }
        agendarRedesenho(ctx, e);
        agendarAlarme(ctx, e);
    }

    static void encerrar(Context ctx) {
        cancelarRedesenho();
        cancelarAlarme(ctx);
        EstadoLive.limpar(ctx);
        NotificationManagerCompat.from(ctx).cancel(ID);
    }

    // ── preenchimento ───────────────────────────────────────────────────────

    private static void preencherPequeno(Context ctx, RemoteViews v, EstadoLive e, long agora) {
        String status = e.status();
        boolean descanso = "descanso".equals(status);
        preencherMiniatura(ctx, v, e, descanso);
        v.setTextViewText(R.id.la_nome, e.concluida() ? ctx.getString(R.string.la_concluido) : e.nome());
        v.setTextViewText(R.id.la_sub, subtitulo(ctx, e));

        if (e.concluida()) {
            v.setViewVisibility(R.id.la_relogio, View.GONE);
            v.setViewVisibility(R.id.la_resumo, View.VISIBLE);
            v.setTextViewText(R.id.la_resumo, "✓");
            v.setTextColor(R.id.la_resumo, cor(ctx, R.color.athos_la_lima));
            return;
        }
        if (e.pausado()) {
            v.setViewVisibility(R.id.la_relogio, View.GONE);
            v.setViewVisibility(R.id.la_resumo, View.VISIBLE);
            v.setTextViewText(R.id.la_resumo, formatarRelogio(segundosAte(e.fimEm(), e.pausadoEm())));
            return;
        }
        boolean preparando = e.preparando(agora);
        boolean contando = e.fimEm() > 0 && !"serie".equals(status) && !preparando;
        v.setViewVisibility(R.id.la_relogio, contando ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.la_resumo, contando ? View.GONE : View.VISIBLE);
        if (contando) {
            relogio(ctx, v, R.id.la_relogio, e.fimEm(), descanso ? R.color.athos_la_descanso : R.color.athos_la_lima);
        } else if (preparando) {
            v.setTextViewText(R.id.la_resumo, String.valueOf(segundosAte(e.inicioEm(), agora)));
        } else {
            v.setTextViewText(R.id.la_resumo, e.porTempo()
                    ? formatarRelogio(e.segundos())
                    : formatarCarga(e.carga()) + " × " + e.reps());
        }
    }

    private static void preencherGrande(Context ctx, RemoteViews v, EstadoLive e, long agora, PendingIntent abrir) {
        String status = e.status();
        boolean descanso = "descanso".equals(status);
        boolean preparando = e.preparando(agora);

        preencherMiniatura(ctx, v, e, descanso);
        v.setTextViewText(R.id.la_nome, e.concluida() ? ctx.getString(R.string.la_treino_hoje) : e.nome());
        v.setTextViewText(R.id.la_sub, subtitulo(ctx, e));
        preencherSegmentos(v, e, descanso);

        v.setViewVisibility(R.id.la_bloco_reps, View.GONE);
        v.setViewVisibility(R.id.la_bloco_tempo, View.GONE);
        v.setViewVisibility(R.id.la_bloco_descanso, View.GONE);
        v.setViewVisibility(R.id.la_bloco_feito, View.GONE);

        if (e.concluida()) {
            chip(ctx, v, R.string.la_chip_feito, R.drawable.athos_la_chip_lima, cor(ctx, R.color.athos_la_lima));
            preencherFeito(ctx, v, e, abrir);
            return;
        }

        // chip de status
        int chipTexto;
        int chipFundo;
        int chipCor;
        if (descanso) {
            chipTexto = R.string.la_chip_descanso;
            chipFundo = R.drawable.athos_la_chip_laranja;
            chipCor = cor(ctx, R.color.athos_la_descanso);
        } else if (e.pausado()) {
            chipTexto = R.string.la_chip_pausado;
            chipFundo = R.drawable.athos_la_chip_neutro;
            chipCor = cor(ctx, R.color.athos_la_texto_baixo);
        } else if (preparando) {
            chipTexto = R.string.la_chip_preparo;
            chipFundo = R.drawable.athos_la_chip_neutro;
            chipCor = 0xFFFFFFFF;
        } else if (e.porTempo() && "serie".equals(status)) {
            chipTexto = R.string.la_chip_pronto;
            chipFundo = R.drawable.athos_la_chip_neutro;
            chipCor = cor(ctx, R.color.athos_la_texto);
        } else {
            chipTexto = R.string.la_chip_serie;
            chipFundo = R.drawable.athos_la_chip_lima;
            chipCor = cor(ctx, R.color.athos_la_lima);
        }
        chip(ctx, v, chipTexto, chipFundo, chipCor);

        if (descanso) {
            preencherDescanso(ctx, v, e, agora);
        } else if (e.porTempo()) {
            preencherTempo(ctx, v, e, agora, preparando);
        } else {
            preencherReps(ctx, v, e);
        }
    }

    private static void preencherReps(Context ctx, RemoteViews v, EstadoLive e) {
        v.setViewVisibility(R.id.la_bloco_reps, View.VISIBLE);
        v.setTextViewText(R.id.la_rot_a, ctx.getString(R.string.la_peso));
        v.setTextViewText(R.id.la_valor_a, comUnidade(ctx, formatarCarga(e.carga()), e.carga() != null ? "kg" : null));
        v.setTextViewText(R.id.la_rot_b, ctx.getString(R.string.la_reps));
        v.setTextViewText(R.id.la_valor_b, String.valueOf(e.reps()));
        v.setContentDescription(R.id.la_ok, ctx.getString(R.string.la_confirmar_desc));
        clique(ctx, v, R.id.la_a_menos, "carga-");
        clique(ctx, v, R.id.la_a_mais, "carga+");
        clique(ctx, v, R.id.la_b_menos, "reps-");
        clique(ctx, v, R.id.la_b_mais, "reps+");
        clique(ctx, v, R.id.la_ok, "confirmar");
    }

    private static void preencherTempo(Context ctx, RemoteViews v, EstadoLive e, long agora, boolean preparando) {
        v.setViewVisibility(R.id.la_bloco_tempo, View.VISIBLE);
        boolean pausado = e.pausado();
        boolean correndo = "cronometro".equals(e.status()) && !preparando && !pausado;
        int meta = e.segundos();
        // Correndo ou pausada: dois botões; pronto ou preparo: o botão alto.
        v.setViewVisibility(R.id.la_acao, correndo || pausado ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.la_acoes_duplas, correndo || pausado ? View.VISIBLE : View.GONE);

        v.setViewVisibility(R.id.la_anel, preparando ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.la_anel_preparo, preparando ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.la_anel_txt, correndo ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.la_anel_relogio, correndo ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.la_ajustes, correndo || preparando ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.la_tempo_sub, correndo || preparando || pausado ? View.VISIBLE : View.GONE);
        if (pausado) v.setViewVisibility(R.id.la_ajustes, View.GONE);

        if (pausado) {
            long total = Math.max(1, e.fimEm() - e.inicioEm());
            long feito = Math.max(0, Math.min(total, e.pausadoEm() - e.inicioEm()));
            String falta = formatarRelogio(segundosAte(e.fimEm(), e.pausadoEm()));
            v.setProgressBar(R.id.la_anel, 1000, (int) (feito * 1000 / total), false);
            v.setTextViewText(R.id.la_anel_txt, falta);
            v.setTextViewTextSize(R.id.la_anel_txt, TypedValue.COMPLEX_UNIT_SP, 19f);
            v.setTextViewText(R.id.la_tempo_titulo, ctx.getString(R.string.la_pausado));
            v.setTextViewText(R.id.la_tempo_sub, ctx.getString(R.string.la_faltam, falta, formatarRelogio(meta)));
            botaoDuplo(ctx, v, R.id.la_acao_a, true, R.drawable.athos_la_ic_play, R.string.la_retomar, "retomar");
            botaoDuplo(ctx, v, R.id.la_acao_b, false, R.drawable.athos_la_ic_ok, R.string.la_concluir, "confirmar");
        } else if (preparando) {
            long resta = Math.max(0, e.inicioEm() - agora);
            v.setProgressBar(R.id.la_anel_preparo, 1000, (int) (resta * 1000 / EstadoLive.PREPARO_MS), false);
            v.setTextViewText(R.id.la_anel_txt, String.valueOf(segundosAte(e.inicioEm(), agora)));
            v.setTextViewTextSize(R.id.la_anel_txt, TypedValue.COMPLEX_UNIT_SP, 32f);
            v.setTextViewText(R.id.la_tempo_titulo, ctx.getString(R.string.la_posicione));
            v.setTextViewText(R.id.la_tempo_sub, ctx.getString(R.string.la_comeca_sozinha));
            acao(ctx, v, R.drawable.athos_la_botao_neutro_alto, R.drawable.athos_la_ic_fechar,
                    R.string.la_cancelar, R.color.athos_la_texto, "cancelar");
        } else if (correndo) {
            long total = Math.max(1, e.fimEm() - e.inicioEm());
            long feito = Math.max(0, Math.min(total, agora - e.inicioEm()));
            v.setProgressBar(R.id.la_anel, 1000, (int) (feito * 1000 / total), false);
            relogio(ctx, v, R.id.la_anel_relogio, e.fimEm(), R.color.athos_la_texto);
            v.setTextViewText(R.id.la_tempo_titulo, ctx.getString(R.string.la_segure));
            v.setTextViewText(R.id.la_tempo_sub, ctx.getString(R.string.la_meta, formatarRelogio(meta)));
            botaoDuplo(ctx, v, R.id.la_acao_a, false, R.drawable.athos_la_ic_pausa, R.string.la_pausar, "pausar");
            botaoDuplo(ctx, v, R.id.la_acao_b, true, R.drawable.athos_la_ic_ok, R.string.la_concluir, "confirmar");
        } else {
            v.setProgressBar(R.id.la_anel, 1000, 0, false);
            v.setTextViewText(R.id.la_anel_txt, formatarRelogio(meta));
            v.setTextViewTextSize(R.id.la_anel_txt, TypedValue.COMPLEX_UNIT_SP, 19f);
            v.setTextViewText(R.id.la_tempo_titulo, ctx.getString(R.string.la_meta_serie));
            clique(ctx, v, R.id.la_seg_menos, "seg-");
            clique(ctx, v, R.id.la_seg_mais, "seg+");
            acao(ctx, v, R.drawable.athos_la_botao_lima_alto, R.drawable.athos_la_ic_play,
                    R.string.la_iniciar, R.color.athos_la_escuro, "iniciar");
        }
    }

    private static void preencherDescanso(Context ctx, RemoteViews v, EstadoLive e, long agora) {
        v.setViewVisibility(R.id.la_bloco_descanso, View.VISIBLE);
        relogio(ctx, v, R.id.la_desc_relogio, e.fimEm(), R.color.athos_la_descanso);

        String proximo = e.proximo();
        String sub;
        if (proximo != null) {
            sub = ctx.getString(R.string.la_proximo_ex, proximo);
        } else if (e.porTempo()) {
            sub = ctx.getString(R.string.la_a_seguir, formatarRelogio(e.segundos()));
        } else if (e.carga() != null) {
            sub = ctx.getString(R.string.la_a_seguir, formatarCarga(e.carga()) + " kg × " + e.reps());
        } else {
            sub = ctx.getString(R.string.la_ate_proxima);
        }
        v.setTextViewText(R.id.la_desc_sub, sub);

        // Barra: quanto falta do descanso (o +15s pode passar do padrão).
        long resta = Math.max(0, e.fimEm() - agora);
        long total = Math.max(e.descansoSeg() * 1000L, resta);
        v.setProgressBar(R.id.la_desc_barra, 1000, total > 0 ? (int) (resta * 1000 / total) : 0, false);

        v.setTextViewText(R.id.la_pular_txt, ctx.getString(R.string.la_pular));
        clique(ctx, v, R.id.la_mais15, "descanso+15");
        clique(ctx, v, R.id.la_pular, "pular");
    }

    private static void preencherMiniatura(Context ctx, RemoteViews v, EstadoLive e, boolean descanso) {
        v.setImageViewResource(R.id.la_icone, e.porTempo() ? R.drawable.athos_la_ic_prancha : R.drawable.athos_la_ic_halter);
        v.setInt(R.id.la_icone, "setColorFilter", cor(ctx, descanso ? R.color.athos_la_descanso : R.color.athos_la_lima));
        v.setInt(R.id.la_thumb, "setBackgroundResource", descanso ? R.drawable.athos_la_thumb_laranja : R.drawable.athos_la_thumb_lima);
        v.setInt(R.id.la_raiz, "setBackgroundResource", descanso ? R.drawable.athos_la_card_descanso : R.drawable.athos_la_card);
    }

    /** No descanso a série já avançou: mostra a próxima. */
    private static String subtitulo(Context ctx, EstadoLive e) {
        if (e.concluida()) return ctx.getString(R.string.la_n_series, e.resumoSeries());
        int res = "descanso".equals(e.status()) ? R.string.la_proxima_de : R.string.la_serie_de;
        return ctx.getString(res, e.serieAtual(), e.totalSeries());
    }

    private static final int[] SEGMENTOS = {
            R.id.la_seg1, R.id.la_seg2, R.id.la_seg3, R.id.la_seg4,
            R.id.la_seg5, R.id.la_seg6, R.id.la_seg7, R.id.la_seg8,
    };

    private static void preencherSegmentos(RemoteViews v, EstadoLive e, boolean descanso) {
        int total = e.totalSeries();
        boolean cabe = !e.concluida() && total > 1 && total <= SEGMENTOS.length;
        v.setViewVisibility(R.id.la_segs, cabe ? View.VISIBLE : View.GONE);
        if (!cabe) return;
        int feitas = e.serieAtual() - 1;
        for (int i = 0; i < SEGMENTOS.length; i++) {
            if (i >= total) {
                v.setViewVisibility(SEGMENTOS[i], View.GONE);
                continue;
            }
            int fundo = i < feitas ? R.drawable.athos_la_seg_feita
                    : i == feitas ? (descanso ? R.drawable.athos_la_seg_agora_descanso : R.drawable.athos_la_seg_agora)
                    : R.drawable.athos_la_seg_vazio;
            v.setViewVisibility(SEGMENTOS[i], View.VISIBLE);
            v.setInt(SEGMENTOS[i], "setBackgroundResource", fundo);
        }
    }

    private static void preencherFeito(Context ctx, RemoteViews v, EstadoLive e, PendingIntent abrir) {
        v.setViewVisibility(R.id.la_bloco_feito, View.VISIBLE);
        v.setTextViewText(R.id.la_feito_titulo, ctx.getString(R.string.la_concluido));
        v.setTextViewText(R.id.la_feito_sub, ctx.getString(R.string.la_resumo_feito,
                e.resumoSeries(), formatarVolume(e.resumoVolumeKg())));
        v.setTextViewText(R.id.la_salvar, ctx.getString(R.string.la_salvar_app));
        v.setOnClickPendingIntent(R.id.la_salvar, abrir);
    }

    private static void chip(Context ctx, RemoteViews v, int texto, int fundo, int corTexto) {
        v.setTextViewText(R.id.la_chip_txt, ctx.getString(texto));
        v.setInt(R.id.la_chip, "setBackgroundResource", fundo);
        v.setTextColor(R.id.la_chip_txt, corTexto);
        v.setTextColor(R.id.la_chip_ponto, corTexto);
    }

    /** Botão baixo da prancha correndo/pausada (Pausar|Retomar, Concluir). Lima = o principal. */
    private static void botaoDuplo(Context ctx, RemoteViews v, int id, boolean lima, int icone, int texto, String acao) {
        int corTexto = cor(ctx, lima ? R.color.athos_la_escuro : R.color.athos_la_texto);
        int icId = id == R.id.la_acao_a ? R.id.la_acao_a_icone : R.id.la_acao_b_icone;
        int txtId = id == R.id.la_acao_a ? R.id.la_acao_a_txt : R.id.la_acao_b_txt;
        v.setInt(id, "setBackgroundResource", lima ? R.drawable.athos_la_botao_lima_alto : R.drawable.athos_la_botao_neutro_alto);
        v.setImageViewResource(icId, icone);
        v.setInt(icId, "setColorFilter", corTexto);
        v.setTextViewText(txtId, ctx.getString(texto));
        v.setTextColor(txtId, corTexto);
        clique(ctx, v, id, acao);
    }

    private static PendingIntent abrirApp(Context ctx) {
        Intent abrir = new Intent(ctx, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, 0, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Botão alto da série por tempo (Iniciar / Cancelar / Concluir). */
    private static void acao(Context ctx, RemoteViews v, int fundo, int icone, int texto, int corTexto, String acao) {
        v.setInt(R.id.la_acao, "setBackgroundResource", fundo);
        v.setImageViewResource(R.id.la_acao_icone, icone);
        v.setTextViewText(R.id.la_acao_txt, ctx.getString(texto));
        v.setTextColor(R.id.la_acao_txt, cor(ctx, corTexto));
        clique(ctx, v, R.id.la_acao, acao);
    }

    /** Chronometer regressivo: a base é o término convertido pro relógio do sistema. */
    private static void relogio(Context ctx, RemoteViews v, int id, long fimEm, int corRes) {
        long restante = Math.max(0, fimEm - System.currentTimeMillis());
        long base = SystemClock.elapsedRealtime() + restante;
        v.setChronometer(id, base, null, true);
        v.setChronometerCountDown(id, true);
        v.setTextColor(id, cor(ctx, corRes));
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

    // ── redesenho com o app dormindo ────────────────────────────────────────

    /**
     * Redesenha o card enquanto há contagem: a cada segundo no preparo (3, 2, 1),
     * a cada 5 s pra barra do descanso e o anel da prancha andarem, e na hora
     * exata em que o preparo ou o relógio acaba. Só vale enquanto o processo
     * existe; o aviso sonoro de fim vem do LocalNotifications agendado pelo app.
     */
    private static void agendarRedesenho(Context ctx, EstadoLive e) {
        cancelarRedesenho();
        long fim = e.fimEm();
        if (fim <= 0 || "serie".equals(e.status()) || e.pausado()) return;
        long agora = System.currentTimeMillis();
        long proximo;
        if (e.preparando(agora)) {
            long resta = e.inicioEm() - agora;
            proximo = agora + Math.min(resta, ((resta - 1) % 1000) + 1);
        } else {
            proximo = Math.min(fim, agora + 5_000L);
        }
        final Context app = ctx.getApplicationContext();
        redesenho = () -> mostrar(app);
        HANDLER.postDelayed(redesenho, Math.max(0, proximo - agora) + 150);
    }

    /**
     * Alarme no fim do descanso/cronômetro: o Handler acima só vale com o app
     * vivo. Exato quando a pessoa liberou "Alarmes e lembretes"; senão o
     * sistema pode atrasar um pouco (o Chronometer do card segue certo).
     */
    private static void agendarAlarme(Context ctx, EstadoLive e) {
        cancelarAlarme(ctx);
        long fim = e.fimEm();
        if (fim <= 0 || "serie".equals(e.status()) || e.pausado() || e.concluida()) return;
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = alarmeRelogio(ctx);
        long quando = fim + 300;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, quando, pi);
            }
        } catch (SecurityException semPermissao) {
            am.set(AlarmManager.RTC_WAKEUP, quando, pi);
        }
    }

    private static void cancelarAlarme(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(alarmeRelogio(ctx));
    }

    private static PendingIntent alarmeRelogio(Context ctx) {
        Intent i = new Intent(ctx, LiveActivityReceiver.class).setAction(LiveActivityReceiver.ACAO_RELOGIO);
        return PendingIntent.getBroadcast(ctx, 910_003, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void cancelarRedesenho() {
        if (redesenho != null) HANDLER.removeCallbacks(redesenho);
        redesenho = null;
    }

    // ── utilitários ─────────────────────────────────────────────────────────

    private static void criarCanal(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel canal = new NotificationChannel(
                CANAL, ctx.getString(R.string.la_canal), NotificationManager.IMPORTANCE_DEFAULT);
        canal.setDescription(ctx.getString(R.string.la_canal_desc));
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

    /** 0:45 / 1:30, como no mockup. */
    private static String formatarRelogio(int segundos) {
        return String.format(Locale.ROOT, "%d:%02d", segundos / 60, segundos % 60);
    }

    /** "80" grande + "kg" pequeno e apagado, como no mockup. */
    private static CharSequence comUnidade(Context ctx, String valor, String unidade) {
        if (unidade == null) return valor;
        SpannableString s = new SpannableString(valor + " " + unidade);
        int i = valor.length() + 1;
        s.setSpan(new RelativeSizeSpan(0.52f), i, s.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        s.setSpan(new ForegroundColorSpan(cor(ctx, R.color.athos_la_texto_baixo)), i, s.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return s;
    }

    private static String formatarVolume(double kg) {
        return String.format(Locale.getDefault(), "%,d", Math.round(kg));
    }

    private static int segundosAte(long fimEm, long agora) {
        return (int) Math.max(1, (fimEm - agora + 999) / 1000);
    }
}
