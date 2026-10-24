package br.com.athoslife.app.widget;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Ponte JS <-> widget de água. Lado TS: src/data/native/widgetAgua.ts.
 *   atualizar({ data, totalMl, metaMl }) — total real do dia, vindo do banco
 *   copinhosPendentes()                  — lê a fila sem apagar
 *   confirmarCopos({ ids })              — remove só os copos já gravados
 *   evento "copo"                        — copo tocado com o app vivo
 *   estadoNaTela() / fixarNaTela()       — botão "Adicionar à tela inicial"
 *                                          (Android 8+: o sistema pergunta e
 *                                          coloca o widget com um toque)
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
        if (!WidgetAguaEstado.pertenceAoUsuario(getContext(), call.getString("usuario", ""))) {
            call.reject("widget_usuario_invalido"); return;
        }
        String data = call.getString("data", WidgetAguaEstado.hoje());
        int total = call.getInt("totalMl", 0);
        int meta = call.getInt("metaMl", 2500);
        WidgetAguaEstado.salvarDoApp(getContext(), data, total, meta, call.getArray("idsRegistrados", new JSArray()));
        WidgetAguaProvider.atualizarTodos(getContext());
        call.resolve();
    }

    @PluginMethod
    public void copinhosPendentes(PluginCall call) {
        if (!WidgetAguaEstado.pertenceAoUsuario(getContext(), call.getString("usuario", ""))) {
            call.reject("widget_usuario_invalido"); return;
        }
        JSONArray fila = WidgetAguaEstado.lerFila(getContext());
        JSArray copos = new JSArray();
        for (int i = 0; i < fila.length(); i++) {
            JSONObject item = fila.optJSONObject(i);
            if (item == null) continue;
            JSObject c = new JSObject();
            c.put("id", item.optString("id"));
            c.put("em", item.optLong("em"));
            c.put("ml", item.optInt("ml", 0));
            c.put("data", item.optString("data", WidgetAguaEstado.hoje()));
            copos.put(c);
        }
        JSObject r = new JSObject();
        r.put("copos", copos);
        call.resolve(r);
    }

    @PluginMethod
    public void configurarUsuario(PluginCall call) {
        WidgetAguaEstado.configurarUsuario(getContext(), call.getString("usuario", ""));
        WidgetAguaProvider.atualizarTodos(getContext());
        call.resolve();
    }

    @PluginMethod
    public void confirmarCopos(PluginCall call) {
        if (!WidgetAguaEstado.pertenceAoUsuario(getContext(), call.getString("usuario", ""))) {
            call.reject("widget_usuario_invalido"); return;
        }
        JSArray ids = call.getArray("ids", new JSArray());
        WidgetAguaEstado.confirmar(getContext(), ids);
        call.resolve();
    }

    private ComponentName componente() {
        return new ComponentName(getContext(), WidgetAguaProvider.class);
    }

    /** Dá pra pedir pro sistema colocar o widget? Já tem algum na tela? */
    @PluginMethod
    public void estadoNaTela(PluginCall call) {
        AppWidgetManager gerenciador = AppWidgetManager.getInstance(getContext());
        JSObject r = new JSObject();
        boolean pode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && gerenciador.isRequestPinAppWidgetSupported();
        r.put("podeFixar", pode);
        r.put("jaNaTela", gerenciador.getAppWidgetIds(componente()).length > 0);
        call.resolve(r);
    }

    @PluginMethod
    public void fixarNaTela(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("sem_suporte"); return;
        }
        AppWidgetManager gerenciador = AppWidgetManager.getInstance(getContext());
        if (!gerenciador.isRequestPinAppWidgetSupported()) {
            call.reject("sem_suporte"); return;
        }
        JSObject r = new JSObject();
        r.put("pedido", gerenciador.requestPinAppWidget(componente(), null, null));
        call.resolve(r);
    }
}
