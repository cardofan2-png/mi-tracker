package com.ricardo.mitracker;

import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Con letra grande en Android la app se desbordaba: se respeta hasta 115 % para que siga cabiendo en pantalla.
    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebSettings ws = getBridge().getWebView().getSettings();
        if (ws.getTextZoom() > 115) ws.setTextZoom(115);
    }
}
