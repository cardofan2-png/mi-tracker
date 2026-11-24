package com.ricardo.mitracker;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Privacidad: Android no deja tomar capturas ni grabar la pantalla de la app, y la oculta en apps recientes.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
    }

    // Con letra grande en Android la app se desbordaba: se respeta hasta 115 % para que siga cabiendo en pantalla.
    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebSettings ws = getBridge().getWebView().getSettings();
        if (ws.getTextZoom() > 115) ws.setTextZoom(115);
    }
}
