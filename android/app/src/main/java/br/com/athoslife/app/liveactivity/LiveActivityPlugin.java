package br.com.athoslife.app.liveactivity;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * Ponte JS <-> Live Activity. Lado TS: src/data/native/liveActivity.ts.
 *   mostrar({ estado })  — grava o estado e (re)desenha o card
 *   encerrar()           — tira o card
 *   acoesPendentes()     — toques feitos com o app fechado (e esvazia a fila)
 *   evento "acao"        — toque feito com o app vivo
 */
@CapacitorPlugin(name = "AthosLiveActivity")
public class LiveActivityPlugin extends Plugin {
    private static volatile LiveActivityPlugin instancia;

    @Override
    public void load() {
        instancia = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instancia == this) instancia = null;
    }

    /** Entrega um toque pro JS. false = app não está vivo (vai pra fila). */
    static boolean emitir(String acao) {
        LiveActivityPlugin p = instancia;
        if (p == null || p.getBridge() == null) return false;
        JSObject dados = new JSObject();
        dados.put("acao", acao);
        // retainUntilConsumed: se o listener ainda não registrou, o evento espera.
        p.notifyListeners("acao", dados, true);
        return true;
    }

    @PluginMethod
    public void mostrar(PluginCall call) {
        JSObject estado = call.getObject("estado");
        if (estado == null) {
            call.reject("estado_obrigatorio");
            return;
        }
        try {
            EstadoLive.de(estado.toString()).salvar(getContext());
        } catch (JSONException e) {
            call.reject("estado_invalido");
            return;
        }
        LiveActivityNotificacao.mostrar(getContext());
        call.resolve();
    }

    @PluginMethod
    public void encerrar(PluginCall call) {
        LiveActivityNotificacao.encerrar(getContext());
        call.resolve();
    }

    @PluginMethod
    public void acoesPendentes(PluginCall call) {
        JSONArray fila = EstadoLive.drenar(getContext());
        JSArray acoes = new JSArray();
        for (int i = 0; i < fila.length(); i++) acoes.put(fila.optString(i));
        JSObject r = new JSObject();
        r.put("acoes", acoes);
        call.resolve(r);
    }
}
