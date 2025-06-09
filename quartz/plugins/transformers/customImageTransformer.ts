import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"

export const customImageTransformer: QuartzTransformerPlugin = () => {
    return {
        name: "customImageTransformer",
        markdownPlugins() {
            return [
                () => (tree) => {
                    visit(tree, "image", (node: any) => {
                        if (typeof node.alt === "string" && node.alt.includes("|")) {
                            const [align, sizeStr] = node.alt.split("|").map((s: string) => s.trim())
                            const width = parseInt(sizeStr) || 400

                            let style = `width: ${width}px;`
                            if (align === "left") {
                                style += " float: left; margin-right: 1em;"
                            } else if (align === "right") {
                                style += " float: right; margin-left: 1em;"
                            } else if (align === "center") {
                                style += " display: block; margin: 1em auto;"
                            }

                            node.type = "html"
                            node.value = `<img src="${node.url}" alt="" style="${style}" /><div style="clear: both;"></div>`
                        }
                    })
                },
            ]
        },
    }
}
