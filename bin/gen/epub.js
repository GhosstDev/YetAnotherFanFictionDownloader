var fs = require("fs");
var path = require('path');
var i = require('../../index');
var archiver = require('archiver');

module.exports = function(options, _callback) {

    let promise = new Promise(function(resolve, reject) {
        var title = options.title || null;
        var content = options.content || null;
        var author = options.author || null;
        var keywords = options.author || null;
        var updated = options.lastUpdate || '2018-08-31T00:25:35' || null;
        var created = options.created || null;
        var date = new Date();
        if (options.file.startsWith("/")) {var filename = options.file;} else {var filename = process.cwd()+"/"+options.file;}
        var bookid = `YAFFS-${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;
        var dir = process.cwd()+"/"+fs.mkdtempSync("yaffs-");

        var contentOPFManifest = '';
        var contentOPFSpine = '';
        var tocNCXNav = '';
        var tocXHTMLNav = '';
        content.forEach(function(chapter, index){
            contentOPFManifest += `<item id="content_${index}_item_${index}" href="${index}.xhtml" media-type="application/xhtml+xml" />\n`;
            contentOPFSpine += `<itemref idref="content_${index}_item_${index}" />\n`;
            tocNCXNav += `<navPoint id="content_${index}_item_${index}" playOrder="${index+1}" class="chapter"><navLabel><text>${chapter.title}</text></navLabel><content src="${index}.xhtml" /></navPoint>`;
            tocXHTMLNav += `<li class="table-of-contents"><a href="${index}.xhtml">${chapter.title}</a></li>`;
        });

        var xhtmlHeader = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><meta charset="UTF-8" /><title>${title}</title><link rel="stylesheet" type="text/css" href="style.css" /></head><body>`;
        var containerXML =`<?xml version="1.0" encoding="UTF-8" ?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
        var tocXHTML = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en"><head><title>${title}</title><meta charset="UTF-8" /><link rel="stylesheet" type="text/css" href="style.css" /></head><body><h1>Table Of Contents</h1><nav id='toc' epub:type='toc'><ol><li><a href='toc.xhtml'>Table Of Contents</a></li>${tocXHTMLNav}</ol></nav></body></html>`;
        var tocNCX = `<?xml version="1.0" encoding="UTF-8"?>
        <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
            <head>
                <meta name="dtb:uid" content="${bookid}" />
                <meta name="dtb:generator" content="yaffs"/>
                <meta name="dtb:depth" content="1"/>
                <meta name="dtb:totalPageCount" content="0"/>
                <meta name="dtb:maxPageNumber" content="0"/>
            </head>
            <docTitle>
                <text>${title}</text>
            </docTitle>
            <docAuthor>
                <text>${author}</text>
            </docAuthor>
            <navMap>
                <navPoint id="tc" playOrder="0" class="chapter">
                    <navLabel>
                        <text>Table Of Contents</text>
                    </navLabel>
                    <content src="toc.xhtml" />
                </navPoint>

                ${tocNCXNav}
            </navMap>
        </ncx>
        `;
        var contentOPF = `<?xml version="1.0" encoding="UTF-8"?>
        <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xml:lang="en" xmlns:media="http://www.idpf.org/epub/vocab/overlays/#" prefix="ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
            <dc:identifier id="BookId">${bookid}</dc:identifier>
            <meta property="dcterms:identifier" id="meta-identifier">BookId</meta>
            <dc:title>${title}</dc:title>
            <meta property="dcterms:title" id="meta-title">${title}</meta>
            <dc:language>en</dc:language>
            <meta property="dcterms:language" id="meta-language">en</meta>
            <meta property="dcterms:modified">2018-08-31T00:25:35Z</meta>
            <dc:creator id="creator">${author}</dc:creator>
            <meta refines="#creator" property="file-as">${author}</meta>
            <meta property="dcterms:publisher">anonymous</meta>
            <dc:publisher>anonymous</dc:publisher>            
            <meta property="dcterms:rights">All rights reserved</meta>
            <dc:rights>Copyright &#x00A9; 2020 by anonymous</dc:rights>
            <meta name="cover" content="image_cover" />
            <meta name="generator" content="yaffs" />
            <meta property="ibooks:specified-fonts">true</meta>
        </metadata>
        <manifest>
            <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
            <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
            <!--<item id="roboto" href="font/roboto.otf" media-type="application/vnd.ms-opentype" />
            <item id="opensans" href="font/opensans.otf" media-type="application/vnd.ms-opentype" />-->
            <item id="css" href="style.css" media-type="text/css" />
            ${contentOPFManifest}
        </manifest>
        <spine toc="ncx">
            <itemref idref="toc" />
            ${contentOPFSpine}
        </spine>
        <guide>
            <reference type="text" title="Table Of Contents" href="toc.xhtml" />
        </guide>
        </package>
        `;
        try {
            i.debug("[COMPILE] Creating Directories... ");
            fs.mkdirSync(dir+"/META-INF");
            fs.mkdirSync(dir+"/OEBPS");
            // fs.mkdirSync(dir+"/OEBPS/font");
            //fs.mkdirSync(dir+"/OEBPS/css");
            i.debug("[COMPILE] Downloading Fonts and Styles... ");
            fs.copyFileSync(__dirname+"/../style.css", dir+"/OEBPS/style.css");
            // fs.copyFileSync(__dirname+"/../font/opensans.otf", dir+"/OEBPS/font/opensans.otf");
            // fs.copyFileSync(__dirname+"/../font/roboto.otf", dir+"/OEBPS/font/roboto.otf");
            i.debug("[COMPILE] Writing Metadata and References... ");
            fs.writeFileSync(dir+"/META-INF/container.xml", containerXML);
            fs.writeFileSync(dir+"/mimetype", "application/epub+zip", 'ascii');
            fs.writeFileSync(dir+"/OEBPS/content.opf", contentOPF);
            fs.writeFileSync(dir+"/OEBPS/toc.ncx", tocNCX);
            fs.writeFileSync(dir+"/OEBPS/toc.xhtml", tocXHTML);
            i.debug("[COMPILE] Writing Content Files... ");
            for (var c = 0; c < content.length; c++) {fs.writeFileSync(`${dir}/OEBPS/${c}.xhtml`, xhtmlHeader+content[c].data.replace(/(&quot;)+/g, '"').replace(/(&apos;)+/g, "'").replace(/(<br>)+/g, "<br />")+"</body></html>");}
            i.debug("[COMPILE] Zipping Files... ");
            var stream = fs.createWriteStream(filename);
            var epub = archiver('zip', {zlib: { level: 9 }});
            stream.on('close', () => {rmDir(dir); resolve();});
            epub.on('warning', err=>{throw err;});
            epub.on('error', err=>{throw err;});
            epub.pipe(stream);
            epub.append(fs.createReadStream(dir+"/mimetype"), {name :'mimetype'});
            epub.directory(dir+"/META-INF", "META-INF");
            epub.directory(dir+"/OEBPS", "OEBPS");
            epub.finalize();
        } catch (error) {
            rmDir(dir)
            i.debug("[COMPILE] "+error);
            reject("Failed to Compile Ebook (use --debug flag to see more detailed errors)");
        }
    });

    return promise;
}

function rmDir(path) {
    if (fs.existsSync(path)) {
        var files = fs.readdirSync(path)
        if (files.length > 0) {
            files.forEach(function(filename) {if (fs.statSync(path + "/" + filename).isDirectory()) {rmDir(path + "/" + filename)} else {fs.unlinkSync(path + "/" + filename)}});
            fs.rmdirSync(path)
        } else {fs.rmdirSync(path)}
    } else {console.log("Directory path not found.")}
}
