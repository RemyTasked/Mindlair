import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    private let appGroupIdentifier = "group.app.mindlair"
    private let urlScheme = "mindlair://share"
    
    override func viewDidLoad() {
        super.viewDidLoad()
        handleSharedContent()
    }
    
    private func handleSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            completeRequest(success: false)
            return
        }
        
        for extensionItem in extensionItems {
            guard let attachments = extensionItem.attachments else { continue }
            
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    handleURLAttachment(attachment)
                    return
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    handleTextAttachment(attachment)
                    return
                }
            }
        }
        
        completeRequest(success: false)
    }
    
    private func handleURLAttachment(_ attachment: NSItemProvider) {
        attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
            guard let self = self else { return }
            
            if let url = item as? URL {
                self.saveAndOpenApp(url: url.absoluteString, text: nil, title: nil)
            } else if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                self.saveAndOpenApp(url: url.absoluteString, text: nil, title: nil)
            } else {
                self.completeRequest(success: false)
            }
        }
    }
    
    private func handleTextAttachment(_ attachment: NSItemProvider) {
        attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (item, error) in
            guard let self = self else { return }
            
            if let text = item as? String {
                if let url = URL(string: text), url.scheme?.hasPrefix("http") == true {
                    self.saveAndOpenApp(url: text, text: nil, title: nil)
                } else {
                    self.saveAndOpenApp(url: nil, text: text, title: nil)
                }
            } else {
                self.completeRequest(success: false)
            }
        }
    }
    
    private func saveAndOpenApp(url: String?, text: String?, title: String?) {
        saveToSharedContainer(url: url, text: text, title: title)
        
        var components = URLComponents(string: urlScheme)
        var queryItems: [URLQueryItem] = []
        
        if let url = url {
            queryItems.append(URLQueryItem(name: "url", value: url))
        }
        if let text = text {
            queryItems.append(URLQueryItem(name: "text", value: text))
        }
        if let title = title {
            queryItems.append(URLQueryItem(name: "title", value: title))
        }
        
        components?.queryItems = queryItems
        
        if let deepLinkURL = components?.url {
            openMainApp(url: deepLinkURL)
        }
        
        completeRequest(success: true)
    }
    
    private func saveToSharedContainer(url: String?, text: String?, title: String?) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else { return }
        
        var sharedData: [String: Any] = [
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let url = url {
            sharedData["url"] = url
        }
        if let text = text {
            sharedData["text"] = text
        }
        if let title = title {
            sharedData["title"] = title
        }
        
        var pendingShares = sharedDefaults.array(forKey: "pendingShares") as? [[String: Any]] ?? []
        pendingShares.append(sharedData)
        
        if pendingShares.count > 50 {
            pendingShares = Array(pendingShares.suffix(50))
        }
        
        sharedDefaults.set(pendingShares, forKey: "pendingShares")
    }
    
    private func openMainApp(url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }
        
        guard let openURL = URL(string: "mindlair://") else { return }
        var components = URLComponents(url: openURL, resolvingAgainstBaseURL: false)
        components?.path = "/share"
        components?.queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
        
        if let finalURL = components?.url {
            extensionContext?.open(finalURL, completionHandler: nil)
        }
    }
    
    private func completeRequest(success: Bool) {
        DispatchQueue.main.async { [weak self] in
            if success {
                self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            } else {
                let error = NSError(domain: "app.mindlair.share", code: 1, userInfo: nil)
                self?.extensionContext?.cancelRequest(withError: error)
            }
        }
    }
}
