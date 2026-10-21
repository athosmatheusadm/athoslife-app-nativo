package br.com.athoslife.app.story;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Abre o editor de Stories do Instagram já com a imagem (Meta "Sharing to Stories").
 * O usuário só confirma a publicação dentro do Instagram.
 * Config: capacitor.config.ts → plugins.AthosInstagram.facebookAppId
 */
@CapacitorPlugin(name = "AthosInstagram")
public class AthosInstagramPlugin extends Plugin {
    private static final String INSTAGRAM = "com.instagram.android";

    @PluginMethod
    public void shareToStory(PluginCall call) {
        String appId = getConfig().getString("facebookAppId", null);
        if (appId == null || appId.isEmpty()) {
            call.reject("Facebook App ID não configurado", "APP_ID_MISSING");
            return;
        }
        Uri uri;
        try {
            uri = writeImage(call.getString("imageBase64"));
        } catch (Exception e) {
            call.reject("Imagem inválida", "INVALID_IMAGE", e);
            return;
        }

        Intent intent = new Intent("com.instagram.share.ADD_TO_STORY");
        intent.putExtra("source_application", appId);
        intent.setDataAndType(uri, "image/jpeg");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.setPackage(INSTAGRAM);
        String top = call.getString("topColor");
        String bottom = call.getString("bottomColor");
        if (top != null) intent.putExtra("top_background_color", top);
        if (bottom != null) intent.putExtra("bottom_background_color", bottom);

        Activity activity = getActivity();
        if (activity.getPackageManager().resolveActivity(intent, 0) == null) {
            call.reject("Instagram não instalado", "INSTAGRAM_NOT_INSTALLED");
            return;
        }
        activity.grantUriPermission(INSTAGRAM, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        activity.startActivity(intent);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    /** Menu de compartilhar do sistema: salvar, WhatsApp, Instagram Feed etc. */
    @PluginMethod
    public void shareImage(PluginCall call) {
        Uri uri;
        try {
            uri = writeImage(call.getString("imageBase64"));
        } catch (Exception e) {
            call.reject("Imagem inválida", "INVALID_IMAGE", e);
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("image/jpeg");
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent chooser = Intent.createChooser(send, "Compartilhar story");
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(chooser);

        JSObject ret = new JSObject();
        ret.put("completed", true); // no Android só sabemos que o menu abriu
        call.resolve(ret);
    }

    private Uri writeImage(String base64) throws Exception {
        if (base64 == null || base64.isEmpty()) throw new IllegalArgumentException("imageBase64 vazio");
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        Context context = getContext();
        File dir = new File(context.getCacheDir(), "athos-story");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Sem acesso ao cache");
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) //noinspection ResultOfMethodCallIgnored
            f.delete();
        File file = new File(dir, "story-" + System.currentTimeMillis() + ".jpg");
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        }
        return FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
    }
}
