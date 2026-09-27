package br.com.athoslife.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Estado do widget de água (contrato HydrationWidgetState do HTML), no aparelho.
 *
 * O app manda o total real do dia (vindo do banco) sempre que abre ou muda a
 * água. Toque num copo com o app fechado soma aqui na hora (o widget reage
 * sem internet) e entra numa fila; o app grava no banco quando abrir e
 * devolve o total certo. O volume do copo é preferência do próprio widget.
 */
final class WidgetAguaEstado {
    private static final String PREFS = "athos_widget_agua";
    static final int[] VOLUMES = {250, 500, 1000};

    final String data;
    final int totalMl;
    final int metaMl;
    final int copoMl;

    private WidgetAguaEstado(String data, int totalMl, int metaMl, int copoMl) {
        this.data = data;
        this.totalMl = totalMl;
        this.metaMl = metaMl;
        this.copoMl = copoMl;
    }

    static String hoje() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Virou o dia sem o app abrir: o total zera sozinho. */
    static WidgetAguaEstado carregar(Context ctx) {
        SharedPreferences p = prefs(ctx);
        String data = p.getString("data", hoje());
        int total = hoje().equals(data) ? p.getInt("total", 0) : 0;
        return new WidgetAguaEstado(hoje(), total, p.getInt("meta", 2500), p.getInt("copo", 500));
    }

    static void salvarDoApp(Context ctx, String data, int totalMl, int metaMl) {
        prefs(ctx).edit()
                .putString("data", data)
                .putInt("total", Math.max(0, totalMl))
                .putInt("meta", metaMl > 0 ? metaMl : 2500)
                .apply();
    }

    static synchronized void somarCopo(Context ctx) {
        WidgetAguaEstado e = carregar(ctx);
        prefs(ctx).edit().putString("data", e.data).putInt("total", e.totalMl + e.copoMl).apply();
        try {
            JSONArray fila = new JSONArray(prefs(ctx).getString("fila", "[]"));
            JSONObject item = new JSONObject();
            item.put("ml", e.copoMl);
            item.put("data", e.data);
            item.put("em", System.currentTimeMillis());
            fila.put(item);
            prefs(ctx).edit().putString("fila", fila.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static void trocarVolume(Context ctx) {
        int atual = carregar(ctx).copoMl;
        int proximo = VOLUMES[0];
        for (int i = 0; i < VOLUMES.length; i++) {
            if (VOLUMES[i] == atual) {
                proximo = VOLUMES[(i + 1) % VOLUMES.length];
                break;
            }
        }
        prefs(ctx).edit().putInt("copo", proximo).apply();
    }

    static synchronized JSONArray drenarFila(Context ctx) {
        JSONArray fila;
        try {
            fila = new JSONArray(prefs(ctx).getString("fila", "[]"));
        } catch (JSONException e) {
            fila = new JSONArray();
        }
        prefs(ctx).edit().remove("fila").apply();
        return fila;
    }

    /** hydrated | dry (< 40% da meta) | empty — mesmo corte do HTML. */
    String humor() {
        if (totalMl <= 0) return "empty";
        return totalMl < metaMl * 0.4 ? "dry" : "hydrated";
    }
}
