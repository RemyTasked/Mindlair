import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as Linking from "expo-linking";

export interface SharedContent {
  url?: string;
  text?: string;
  title?: string;
  type: "url" | "text";
}

interface ShareIntentContextType {
  sharedContent: SharedContent | null;
  setSharedContent: (content: SharedContent | null) => void;
  clearSharedContent: () => void;
  voiceCaptureRequested: boolean;
  consumeVoiceCaptureRequest: () => void;
}

const Context = createContext<ShareIntentContextType>({
  sharedContent: null,
  setSharedContent: () => {},
  clearSharedContent: () => {},
  voiceCaptureRequested: false,
  consumeVoiceCaptureRequest: () => {},
});

export function ShareIntentProvider({ children }: { children: ReactNode }) {
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(null);
  const [voiceCaptureRequested, setVoiceCaptureRequested] = useState(false);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      parseShareUrl(event.url);
    };

    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        parseShareUrl(initialUrl);
      }
    };

    checkInitialUrl();
    const subscription = Linking.addEventListener("url", handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  const parseShareUrl = (url: string) => {
    try {
      const parsed = Linking.parse(url);

      // Voice capture deep-link: mindlair://voice-capture
      if (
        parsed.hostname === "voice-capture" ||
        parsed.path === "voice-capture"
      ) {
        setVoiceCaptureRequested(true);
        return;
      }

      if (parsed.queryParams) {
        const { url: sharedUrl, text, title } = parsed.queryParams as {
          url?: string;
          text?: string;
          title?: string;
        };

        if (sharedUrl || text) {
          setSharedContent({
            url: sharedUrl,
            text,
            title,
            type: sharedUrl ? "url" : "text",
          });
        }
      }
    } catch (error) {
      console.error("Failed to parse share URL:", error);
    }
  };

  const clearSharedContent = () => {
    setSharedContent(null);
  };

  const consumeVoiceCaptureRequest = () => {
    setVoiceCaptureRequested(false);
  };

  return (
    <Context.Provider
      value={{
        sharedContent,
        setSharedContent,
        clearSharedContent,
        voiceCaptureRequested,
        consumeVoiceCaptureRequest,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useShareIntent() {
  return useContext(Context);
}
