package br.com.athoslife.app.mascote;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.Locale;

/** Ponte entre o JavaScript (mascoteIcone.ts) e a troca de ícone nativa. */
@CapacitorPlugin(name = "MascoteIcone")
public class MascoteIconePlugin extends Plugin {

    @Override
    public void load() {
        MascoteIcone.emPrimeiroPlano = true;
    }

    /**
     * Recebe { sono: { inicio, fim } | null, conquistaAte: number | null }
     * (inicio/fim em minutos desde a meia-noite, conquistaAte em ms),
     * guarda, agenda as próximas trocas e devolve o estado atual.
     */
    @PluginMethod
    public void sincronizar(PluginCall call) {
        JSObject dados = call.getData();

        int inicio = -1;
        int fim = -1;
        JSONObject sono = dados.optJSONObject("sono");
        if (sono != null) {
            inicio = sono.optInt("inicio", -1);
            fim = sono.optInt("fim", -1);
        }
        long conquistaAte = dados.isNull("conquistaAte") ? 0L : dados.optLong("conquistaAte", 0L);

        Context ctx = getContext();
        MascoteIcone.salvar(ctx, inicio, fim, conquistaAte);
        MascoteIcone.agendar(ctx);
        MascoteIcone.aplicarSePossivel(ctx); // com o app na tela, a troca fica para quando ele sair

        JSObject ret = new JSObject();
        ret.put("estado", MascoteIcone.estadoAtual(ctx).name().toLowerCase(Locale.ROOT));
        call.resolve(ret);
    }

    @Override
    protected void handleOnStart() {
        MascoteIcone.emPrimeiroPlano = true;
    }

    /** O app saiu da tela: momento seguro para trocar o ícone. */
    @Override
    protected void handleOnStop() {
        MascoteIcone.emPrimeiroPlano = false;
        MascoteIcone.aplicarSePossivel(getContext());
    }
}
