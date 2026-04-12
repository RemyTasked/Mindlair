/// NSFW / explicit-content domain blocklist.
/// URLs matching these domains are silently dropped before capture events are emitted.

const BLOCKED_DOMAINS: &[&str] = &[
    "pornhub.com",
    "xvideos.com",
    "xnxx.com",
    "xhamster.com",
    "redtube.com",
    "youporn.com",
    "spankbang.com",
    "tube8.com",
    "beeg.com",
    "brazzers.com",
    "bangbros.com",
    "realitykings.com",
    "naughtyamerica.com",
    "mofos.com",
    "twistys.com",
    "babes.com",
    "digitalplayground.com",
    "kink.com",
    "eporner.com",
    "tnaflix.com",
    "drtuber.com",
    "txxx.com",
    "hclips.com",
    "porntrex.com",
    "fuq.com",
    "4tube.com",
    "sexvid.xxx",
    "sex.com",
    "youjizz.com",
    "pornone.com",
    "thumbzilla.com",
    "porn.com",
    "porntube.com",
    "xtube.com",
    "cam4.com",
    "chaturbate.com",
    "livejasmin.com",
    "bongacams.com",
    "stripchat.com",
    "myfreecams.com",
    "camsoda.com",
    "onlyfans.com",
    "fansly.com",
    "manyvids.com",
    "clips4sale.com",
    "iwara.tv",
    "hentaihaven.xxx",
    "hanime.tv",
    "nhentai.net",
    "rule34.xxx",
    "e-hentai.org",
    "gelbooru.com",
    "danbooru.donmai.us",
    "literotica.com",
    "fapello.com",
    "coomer.su",
    "motherless.com",
    "efukt.com",
    "heavy-r.com",
    "bestgore.fun",
];

/// Returns true if the URL belongs to a blocked NSFW domain.
pub fn is_url_blocked(url: &str) -> bool {
    let hostname = match extract_hostname(url) {
        Some(h) => h,
        None => return false,
    };

    for domain in BLOCKED_DOMAINS {
        if hostname == *domain || hostname.ends_with(&format!(".{}", domain)) {
            return true;
        }
    }

    false
}

fn extract_hostname(url: &str) -> Option<String> {
    // Handle URLs with scheme
    if let Some(after_scheme) = url.strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
    {
        let host = after_scheme.split('/').next().unwrap_or(after_scheme);
        let host = host.split(':').next().unwrap_or(host);
        return Some(host.to_lowercase());
    }

    // Bare hostname (unlikely in practice but handle gracefully)
    let host = url.split('/').next().unwrap_or(url);
    let host = host.split(':').next().unwrap_or(host);
    if host.contains('.') {
        return Some(host.to_lowercase());
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_exact_domain() {
        assert!(is_url_blocked("https://pornhub.com/video/123"));
    }

    #[test]
    fn blocks_subdomain() {
        assert!(is_url_blocked("https://www.pornhub.com/"));
        assert!(is_url_blocked("https://de.xhamster.com/page"));
    }

    #[test]
    fn allows_clean_urls() {
        assert!(!is_url_blocked("https://nytimes.com/2025/politics"));
        assert!(!is_url_blocked("https://youtube.com/watch?v=abc"));
        assert!(!is_url_blocked("https://arxiv.org/abs/2301.00001"));
    }

    #[test]
    fn handles_malformed_urls() {
        assert!(!is_url_blocked("not a url"));
        assert!(!is_url_blocked(""));
    }
}
