package br.com.athoslife.app.liveactivity;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Recebe os toques nos botões do card. Aplica a ação na cópia local (o card
 * reage na hora, mesmo com o app dormindo) e entrega pro app: evento direto
 * se o app está vivo, senão fila no aparelho pra quando ele abrir.
 */
public class LiveActivityReceiver extends BroadcastReceiver {
    static final String ACAO_BOTAO = "br.com.athoslife.app.LIVE_ACTIVITY_BOTAO";
    static final String EXTRA_ACAO = "acao";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (!ACAO_BOTAO.equals(intent.getAction())) return;
        String acao = intent.getStringExtra(EXTRA_ACAO);
        if (acao == null) return;

        EstadoLive e = EstadoLive.carregar(ctx);
        if (e == null) return;
        e.aplicar(acao, System.currentTimeMillis());
        e.salvar(ctx);
        LiveActivityNotificacao.mostrar(ctx);

        if (!LiveActivityPlugin.emitir(acao)) EstadoLive.enfileirar(ctx, acao);
    }
}
