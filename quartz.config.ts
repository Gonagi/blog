import { customImageTransformer } from "./quartz/plugins/transformers/customImageTransformer"
import { QuartzConfig } from "./quartz/cfg"
import { IndexBuilder } from "./quartz/plugins/transformers/IndexBuilder"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Gonagi",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "google",
      tagId: "G-P876DL2PLW",
    },
    locale: "ko-KR",
    baseUrl: "gonagi.pages.dev",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#fafafa",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#8B0000",
          tertiary: "#E64A19",
          highlight: "rgba(255, 0, 0, 0.1)",
          textHighlight: "#ffb700",
        },
        darkMode: {
          light: "#212121",
          lightgray: "#424242",
          gray: "#616161",
          darkgray: "#bdbdbd",
          dark: "#e0e0e0",
          secondary: "#B71C1C",
          tertiary: "#FF5722",
          highlight: "rgba(255, 0, 0, 0.1)",
          textHighlight: "#e6c230",
        },
      },
    },
  },
  plugins: {
    transformers: [
	  IndexBuilder(),
      customImageTransformer(),
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-dark",
          dark: "github-dark",
        },
        keepBackground: true,
		defaultLanguage: "plaintext",
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
