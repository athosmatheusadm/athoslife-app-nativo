package br.com.athoslife.app.mascote;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Acorda na hora agendada (início/fim do sono, meia-noite) e também depois de
 * reiniciar o celular, atualizar o app ou mudar o relógio — casos em que o
 * Android apaga os alarmes. Troca o ícone e agenda a próxima troca.
 */
public class MascoteIconeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        MascoteIcone.aplicarSePossivel(context);
        MascoteIcone.agendar(context);
    }
}
