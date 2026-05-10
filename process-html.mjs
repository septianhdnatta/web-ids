import fs from 'node:fs/promises'
import { globby } from 'globby'
import { minify } from 'html-minifier'

const path = './.vercel/output/static'
const files = await globby(`${path}/**/*.html`)

await Promise.all(
    files.map(async (file) => {
        console.log('📄 Processing file:', file)
        let html = await fs.readFile(file, 'utf-8')

        html = minify(html, {
            removeComments: true,
            collapseWhitespace: true,
            removeAttributeQuotes: false,
            removeOptionalTags: false,
            minifyJS: true,
            minifyCSS: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        })

        await fs.writeFile(file, html)
        console.log('✅ Minified:', file)
    })
)

console.log(`🎉 Selesai! ${files.length} file HTML telah di-minify.`)
