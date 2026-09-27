package br.com.athoslife.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.net.Uri;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import android.widget.RemoteViews;

import java.text.NumberFormat;
import java.util.Locale;

import br.com.athoslife.app.MainActivity;
import br.com.athoslife.app.R;

/**
 * Widget de hidratação da tela inicial (athoslife-widget-hidratacao.html):
 *  - Life: abre o app; muda de humor (colorido / cinza "ressecado" abaixo de
 *    40% da meta / apagado sem água nenhuma).
 *  - Copos (5): cada um = 1/5 da meta; toque soma o volume do copo.
 *  - Câmera: abre o app direto no scanner.
 *  - Botão de volume ("..." do HTML): 250 ml -> 500 ml -> 1 L.
 */
public class WidgetAguaProvider extends AppWidgetProvider {
    static final String ACAO_COPO = "br.com.athoslife.app.WIDGET_AGUA_COPO";
    static final String ACAO_VOLUME = "br.com.athoslife.app.WIDGET_AGUA_VOLUME";

    private static final int[] COPOS = {R.id.wg_copo_0, R.id.wg_copo_1, R.id.wg_copo_2, R.id.wg_copo_3, R.id.wg_copo_4};
    private static final int[] NIVEIS = {
            R.drawable.athos_wg_copo_0, R.drawable.athos_wg_copo_25, R.drawable.athos_wg_copo_50,
            R.drawable.athos_wg_copo_75, R.drawable.athos_wg_copo_100};

    private static Bitmap lifeCinza;

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        atualizarTodos(ctx);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String acao = intent.getAction();
        if (ACAO_COPO.equals(acao)) {
            WidgetAguaEstado.somarCopo(ctx);
            atualizarTodos(ctx);
            WidgetAguaPlugin.avisarFila();
        } else if (ACAO_VOLUME.equals(acao)) {
            WidgetAguaEstado.trocarVolume(ctx);
            atualizarTodos(ctx);
        }
    }

    static void atualizarTodos(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, WidgetAguaProvider.class));
        if (ids.length == 0) return;
        RemoteViews v = montar(ctx, WidgetAguaEstado.carregar(ctx));
        mgr.updateAppWidget(ids, v);
    }

    private static RemoteViews montar(Context ctx, WidgetAguaEstado e) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.athos_widget_agua);

        // Contador "1.500 / 2.500 ml" com o total em verde.
        NumberFormat nf = NumberFormat.getIntegerInstance(new Locale("pt", "BR"));
        SpannableStringBuilder txt = new SpannableStringBuilder();
        String total = nf.format(e.totalMl);
        txt.append(total);
        txt.setSpan(new ForegroundColorSpan(0xFF21E6A6), 0, total.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        txt.setSpan(new StyleSpan(Typeface.BOLD), 0, total.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        txt.append(" / ").append(nf.format(e.metaMl)).append(" ml");
        v.setTextViewText(R.id.wg_contador, txt);

        // Copos: nível de cada um = quanto da sua fatia (meta/5) já foi bebido.
        double porCopo = e.metaMl / 5.0;
        for (int i = 0; i < COPOS.length; i++) {
            double nivel = Math.max(0, Math.min(1, e.totalMl / porCopo - i));
            int idx = (int) Math.round(nivel * 4);
            v.setImageViewResource(COPOS[i], NIVEIS[idx]);
            v.setOnClickPendingIntent(COPOS[i], broadcast(ctx, ACAO_COPO, 10 + i));
        }

        v.setTextViewText(R.id.wg_volume, e.copoMl >= 1000 ? "1 L" : e.copoMl + "\nml");
        v.setOnClickPendingIntent(R.id.wg_volume, broadcast(ctx, ACAO_VOLUME, 20));

        // Humor do Life.
        String humor = e.humor();
        if ("hydrated".equals(humor)) {
            v.setImageViewResource(R.id.wg_life, R.drawable.athos_widget_life);
            v.setInt(R.id.wg_life, "setImageAlpha", 255);
        } else {
            Bitmap cinza = lifeCinza(ctx);
            if (cinza != null) v.setImageViewBitmap(R.id.wg_life, cinza);
            v.setInt(R.id.wg_life, "setImageAlpha", "empty".equals(humor) ? 140 : 255);
        }

        v.setOnClickPendingIntent(R.id.wg_life, abrirApp(ctx, "athoslife://abrir/home", 30));
        v.setOnClickPendingIntent(R.id.wg_camera, abrirApp(ctx, "athoslife://abrir/scanner", 31));
        return v;
    }

    private static PendingIntent broadcast(Context ctx, String acao, int codigo) {
        Intent it = new Intent(ctx, WidgetAguaProvider.class).setAction(acao);
        return PendingIntent.getBroadcast(ctx, codigo, it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Abre o app num link próprio; o JS (appUrlOpen) navega pra rota. */
    private static PendingIntent abrirApp(Context ctx, String link, int codigo) {
        Intent it = new Intent(Intent.ACTION_VIEW, Uri.parse(link), ctx, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, codigo, it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Life em tons de cinza ("ressecado") — gerado uma vez e guardado. */
    private static synchronized Bitmap lifeCinza(Context ctx) {
        if (lifeCinza != null) return lifeCinza;
        Bitmap original = BitmapFactory.decodeResource(ctx.getResources(), R.drawable.athos_widget_life);
        if (original == null) return null;
        Bitmap saida = Bitmap.createBitmap(original.getWidth(), original.getHeight(), Bitmap.Config.ARGB_8888);
        ColorMatrix cm = new ColorMatrix();
        cm.setSaturation(0.1f);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColorFilter(new ColorMatrixColorFilter(cm));
        new Canvas(saida).drawBitmap(original, 0, 0, p);
        lifeCinza = saida;
        return saida;
    }
}
