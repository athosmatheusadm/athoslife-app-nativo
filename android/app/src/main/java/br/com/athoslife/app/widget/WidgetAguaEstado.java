package br.com.athoslife.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;
import java.util.HashSet;
import java.nio.charset.StandardCharsets;

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

    static synchronized void salvarDoApp(Context ctx, String data, int totalMl, int metaMl, JSONArray idsRegistrados) {
        HashSet<String> registrados = new HashSet<>();
        for (int i = 0; i < idsRegistrados.length(); i++) registrados.add(idsRegistrados.optString(i));
        int pendente = 0;
        JSONArray fila = lerFila(ctx);
        for (int i = 0; i < fila.length(); i++) {
            JSONObject item = fila.optJSONObject(i);
            if (item != null && data.equals(item.optString("data")) && !registrados.contains(item.optString("id"))) pendente += item.optInt("ml", 0);
        }
        prefs(ctx).edit()
                .putString("data", data)
                .putInt("total", Math.max(0, totalMl) + pendente)
                .putInt("meta", metaMl > 0 ? metaMl : 2500)
                .apply();
    }

    static synchronized void somarCopo(Context ctx) {
        if (prefs(ctx).getString("usuario", "").isEmpty()) return;
        WidgetAguaEstado e = carregar(ctx);
        try {
            JSONArray fila = new JSONArray(prefs(ctx).getString("fila", "[]"));
            JSONObject item = new JSONObject();
            item.put("id", UUID.randomUUID().toString());
            item.put("ml", e.copoMl);
            item.put("data", e.data);
            item.put("em", System.currentTimeMillis());
            fila.put(item);
            prefs(ctx).edit().putString("fila", fila.toString())
                    .putString("data", e.data).putInt("total", e.totalMl + e.copoMl).apply();
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

    static synchronized JSONArray lerFila(Context ctx) {
        JSONArray fila;
        try {
            fila = new JSONArray(prefs(ctx).getString("fila", "[]"));
        } catch (JSONException e) {
            fila = new JSONArray();
        }
        // Migra entradas antigas para ids estáveis, sem apagar a fila ao ler.
        for (int i = 0; i < fila.length(); i++) {
            JSONObject item = fila.optJSONObject(i);
            if (item == null || item.has("id")) continue;
            try {
                String chave = item.optString("data") + ":" + item.optLong("em") + ":" + item.optInt("ml") + ":" + i;
                item.put("id", UUID.nameUUIDFromBytes(chave.getBytes(StandardCharsets.UTF_8)).toString());
            } catch (JSONException e) { throw new IllegalStateException(e); }
        }
        prefs(ctx).edit().putString("fila", fila.toString()).apply();
        return fila;
    }

    static synchronized void confirmar(Context ctx, JSONArray ids) {
        HashSet<String> confirmados = new HashSet<>();
        for (int i = 0; i < ids.length(); i++) confirmados.add(ids.optString(i));
        JSONArray restante = new JSONArray();
        JSONArray fila = lerFila(ctx);
        for (int i = 0; i < fila.length(); i++) {
            JSONObject item = fila.optJSONObject(i);
            if (item != null && !confirmados.contains(item.optString("id"))) restante.put(item);
        }
        prefs(ctx).edit().putString("fila", restante.toString()).apply();
    }

    static synchronized void configurarUsuario(Context ctx, String usuario) {
        SharedPreferences p = prefs(ctx);
        String anterior = p.getString("usuario", "");
        if (usuario.equals(anterior)) return;
        SharedPreferences.Editor editor = p.edit().putString("usuario", usuario);
        // Arquiva por conta antes de sair/trocar: água offline não é transferida
        // nem perdida. Ao voltar à mesma conta, sua fila é restaurada.
        if (!anterior.isEmpty()) {
            editor.putString("fila_" + anterior, p.getString("fila", "[]"))
                    .putString("data_" + anterior, p.getString("data", ""))
                    .putInt("total_" + anterior, p.getInt("total", 0))
                    .putInt("meta_" + anterior, p.getInt("meta", 2500));
        }
        if (usuario.isEmpty()) {
            editor.remove("fila").remove("data").remove("total").remove("meta");
        } else if (!anterior.isEmpty() || p.contains("fila_" + usuario)) {
            editor.putString("fila", p.getString("fila_" + usuario, "[]"))
                    .putString("data", p.getString("data_" + usuario, ""))
                    .putInt("total", p.getInt("total_" + usuario, 0))
                    .putInt("meta", p.getInt("meta_" + usuario, 2500));
        }
        editor.apply();
    }

    static boolean temUsuario(Context ctx) {
        return !prefs(ctx).getString("usuario", "").isEmpty();
    }

    static boolean pertenceAoUsuario(Context ctx, String usuario) {
        return !usuario.isEmpty() && usuario.equals(prefs(ctx).getString("usuario", ""));
    }

    /** hydrated | dry (< 40% da meta) | empty — mesmo corte do HTML. */
    /** 0 vazio · 1 com sede (< 40%) · 2 indo bem · 3 quase lá (≥ 75%) · 4 meta batida. */
    int faixa() {
        if (totalMl <= 0) return 0;
        if (totalMl < metaMl * 0.4) return 1;
        if (totalMl >= metaMl) return 4;
        return totalMl >= metaMl * 0.75 ? 3 : 2;
    }
}
