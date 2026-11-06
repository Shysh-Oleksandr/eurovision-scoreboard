import UIKit
import Capacitor
import GoogleSignIn

/// Capacitor's bridge with the app's own plugins registered. App-local
/// plugins aren't discovered like packaged ones; they must be registered here,
/// before the web view loads.
class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(DouzeHapticsPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Google Sign-In redirect (@capgo/capacitor-social-login). On iOS 15+
        // the SDK normally completes inside its auth session; this covers the
        // URL-callback path its docs require.
        let remaining = URLContexts.filter { !GIDSignIn.sharedInstance.handle($0.url) }
        guard !remaining.isEmpty else { return }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: remaining)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
