import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        // Privacidad: iOS no permite bloquear capturas; se tapa la app mientras se graba o se refleja la pantalla.
        NotificationCenter.default.addObserver(self, selector: #selector(updateShield), name: UIScreen.capturedDidChangeNotification, object: nil)
        updateShield()
    }

    private var shield: UIView?

    @objc private func updateShield() {
        if UIScreen.main.isCaptured { showShield() } else { hideShield() }
    }

    private func showShield() {
        guard shield == nil, let w = window else { return }
        let v = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterialDark))
        v.frame = w.bounds
        v.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let l = UILabel()
        l.text = "MokiFit"
        l.textColor = .white
        l.font = .boldSystemFont(ofSize: 28)
        l.sizeToFit()
        l.center = CGPoint(x: v.bounds.midX, y: v.bounds.midY)
        l.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin, .flexibleTopMargin, .flexibleBottomMargin]
        v.contentView.addSubview(l)
        w.addSubview(v)
        shield = v
    }

    private func hideShield() {
        if UIScreen.main.isCaptured { return }
        shield?.removeFromSuperview()
        shield = nil
    }

    // Tapa la app en el selector de apps recientes.
    func sceneWillResignActive(_ scene: UIScene) { showShield() }
    func sceneDidBecomeActive(_ scene: UIScene) { hideShield() }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
