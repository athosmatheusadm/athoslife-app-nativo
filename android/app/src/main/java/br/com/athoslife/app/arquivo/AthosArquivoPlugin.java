package br.com.athoslife.app.arquivo;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * "Baixar meus dados" no APK: o WebView ignora link com download, então o
 * arquivo vai pro cache do app e abre o menu do sistema (Drive, e-mail,
 * Arquivos…). A cópia anterior é apagada a cada exportação.
 */
@CapacitorPlugin(name = "AthosArquivo")
public class AthosArquivoPlugin extends Plugin {

    @PluginMethod
    public void compartilharTexto(PluginCall call) {
        String texto = call.getString("texto");
        String nome = call.getString("nome", "athoslife.json");
        String tipo = call.getString("tipo", "application/json");
        String titulo = call.getString("titulo", "");
        if (texto == null) {
            call.reject("Texto vazio", "SEM_TEXTO");
            return;
        }
        // Só o nome do arquivo, sem pastas.
        nome = nome.replaceAll("[^A-Za-z0-9._-]", "_");
        Uri uri;
        try {
            Context context = getContext();
            File dir = new File(context.getCacheDir(), "athos-export");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Sem acesso ao cache");
            File[] antigos = dir.listFiles();
            if (antigos != null) for (File f : antigos) //noinspection ResultOfMethodCallIgnored
                f.delete();
            File file = new File(dir, nome);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(texto.getBytes(StandardCharsets.UTF_8));
            }
            uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
        } catch (Exception e) {
            call.reject("Não deu pra salvar o arquivo", "FALHA_ARQUIVO", e);
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType(tipo);
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent chooser = Intent.createChooser(send, titulo);
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(chooser);
        call.resolve(new JSObject());
    }
}
