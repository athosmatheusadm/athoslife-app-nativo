package br.com.athoslife.app.widget;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Ponte JS <-> widget de água. Lado TS: src/data/native/widgetAgua.ts.
 *   atualizar({ data, totalMl, metaMl }) — total real do dia, vindo do banco
 *   copinhosPendentes()                  — copos tocados no widget (e esvazia)
 *   evento "copo"                        — copo tocado com o app vivo
 */
@CapacitorPlugin(name = "AthosWidgetAgua")
public class WidgetAguaPlugin extends Plugin {
    private static volatile WidgetAguaPlugin instancia;

    @Override
    public void load() {
        instancia = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instancia == this) instancia = null;
    }

    /** Avisa o app (se vivo) que tem copo na fila pra gravar. */
    static void avisarFila() {
        WidgetAguaPlugin p = instancia;
        if (p == null || p.getBridge() == null) return;
        p.notifyListeners("copo", new JSObject(), true);
    }

    @PluginMethod
    public void atualizar(PluginCall call) {
        String data = call.getString("data", WidgetAguaEstado.hoje());
        int total = call.getInt("totalMl", 0);
        int meta = call.getInt("metaMl", 2500);
        WidgetAguaEstado.salvarDoApp(getContext(), data, total, meta);
        WidgetAguaProvider.atualizarTodos(getContext());
        call.resolve();
    }

    @PluginMethod
    public void copinhosPendentes(PluginCall call) {
        JSONArray fila = WidgetAguaEstado.drenarFila(getContext());
        JSArray copos = new JSArray();
        for (int i = 0; i < fila.length(); i++) {
            JSONObject item = fila.optJSONObject(i);
            if (item == null) continue;
            JSObject c = new JSObject();
            c.put("ml", item.optInt("ml", 0));
            c.put("data", item.optString("data", WidgetAguaEstado.hoje()));
            copos.put(c);
        }
        JSObject r = new JSObject();
        r.put("copos", copos);
        call.resolve(r);
    }
}
