package br.com.athoslife.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import br.com.athoslife.app.liveactivity.LiveActivityPlugin;
import br.com.athoslife.app.widget.WidgetAguaPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins próprios do app (não vêm do npm) — registrar antes do super.
        registerPlugin(LiveActivityPlugin.class);
        registerPlugin(WidgetAguaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
