//! Engine Registry module
//!
//! Manages conversion engines and their capabilities.
//! Each engine registers its supported input/output formats.

use std::collections::HashMap;

use crate::error::{ApiError, ConversionSuggestion};
use crate::models::EngineInfo;

/// Represents a conversion engine's capabilities
#[derive(Debug, Clone)]
pub struct Engine {
    /// Unique engine identifier
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Description
    pub description: String,
    /// Map of input format to supported output formats
    pub conversions: HashMap<String, Vec<String>>,
}

impl Engine {
    /// Create a new engine
    pub fn new(id: &str, name: &str, description: &str) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            conversions: HashMap::new(),
        }
    }

    /// Add a supported conversion
    pub fn add_conversion(mut self, from: &str, to_formats: Vec<&str>) -> Self {
        let from = from.to_lowercase();
        let to: Vec<String> = to_formats.iter().map(|s| s.to_lowercase()).collect();
        self.conversions.insert(from, to);
        self
    }

    /// Check if this engine supports a specific conversion
    pub fn supports_conversion(&self, from: &str, to: &str) -> bool {
        let from = from.to_lowercase();
        let to = to.to_lowercase();
        
        self.conversions
            .get(&from)
            .map(|outputs| outputs.contains(&to))
            .unwrap_or(false)
    }

    /// Get all supported input formats
    pub fn input_formats(&self) -> Vec<String> {
        self.conversions.keys().cloned().collect()
    }

    /// Get all supported output formats
    pub fn output_formats(&self) -> Vec<String> {
        let mut outputs: Vec<String> = self.conversions
            .values()
            .flatten()
            .cloned()
            .collect();
        outputs.sort();
        outputs.dedup();
        outputs
    }

    /// Get supported output formats for a given input format
    pub fn output_formats_for(&self, from: &str) -> Vec<String> {
        let from = from.to_lowercase();
        self.conversions
            .get(&from)
            .cloned()
            .unwrap_or_default()
    }

    /// Convert to EngineInfo for API response
    pub fn to_info(&self) -> EngineInfo {
        EngineInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            description: self.description.clone(),
            supported_input_formats: self.input_formats(),
            supported_output_formats: self.output_formats(),
        }
    }
}

/// Registry of all available conversion engines
#[derive(Debug, Clone)]
pub struct EngineRegistry {
    engines: HashMap<String, Engine>,
}

impl EngineRegistry {
    /// Create a new engine registry with default engines
    pub fn new() -> Self {
        let mut registry = Self {
            engines: HashMap::new(),
        };
        
        // Register all available engines based on ConvertX converters
        registry.register_default_engines();
        
        registry
    }

    /// Register default engines based on ConvertX converters
    fn register_default_engines(&mut self) {
        // FFmpeg - Audio/Video conversion
        let ffmpeg = Engine::new(
            "ffmpeg",
            "FFmpeg",
            "Audio and video conversion using FFmpeg"
        )
        .add_conversion("mp4", vec!["webm", "avi", "mkv", "mov", "mp3", "wav", "flac", "ogg", "gif"])
        .add_conversion("webm", vec!["mp4", "avi", "mkv", "mov", "mp3", "wav", "flac", "ogg", "gif"])
        .add_conversion("avi", vec!["mp4", "webm", "mkv", "mov", "mp3", "wav", "flac", "ogg", "gif"])
        .add_conversion("mkv", vec!["mp4", "webm", "avi", "mov", "mp3", "wav", "flac", "ogg", "gif"])
        .add_conversion("mov", vec!["mp4", "webm", "avi", "mkv", "mp3", "wav", "flac", "ogg", "gif"])
        .add_conversion("mp3", vec!["wav", "flac", "ogg", "m4a", "aac"])
        .add_conversion("wav", vec!["mp3", "flac", "ogg", "m4a", "aac"])
        .add_conversion("flac", vec!["mp3", "wav", "ogg", "m4a", "aac"])
        .add_conversion("ogg", vec!["mp3", "wav", "flac", "m4a", "aac"])
        .add_conversion("m4a", vec!["mp3", "wav", "flac", "ogg", "aac"])
        .add_conversion("gif", vec!["mp4", "webm"]);
        self.register(ffmpeg);

        // ImageMagick - Image conversion
        let imagemagick = Engine::new(
            "imagemagick",
            "ImageMagick",
            "Image format conversion using ImageMagick"
        )
        .add_conversion("png", vec!["jpg", "jpeg", "gif", "bmp", "webp", "tiff", "ico", "pdf"])
        .add_conversion("jpg", vec!["png", "gif", "bmp", "webp", "tiff", "ico", "pdf"])
        .add_conversion("jpeg", vec!["png", "gif", "bmp", "webp", "tiff", "ico", "pdf"])
        .add_conversion("gif", vec!["png", "jpg", "jpeg", "bmp", "webp", "tiff"])
        .add_conversion("bmp", vec!["png", "jpg", "jpeg", "gif", "webp", "tiff"])
        .add_conversion("webp", vec!["png", "jpg", "jpeg", "gif", "bmp", "tiff"])
        .add_conversion("tiff", vec!["png", "jpg", "jpeg", "gif", "bmp", "webp", "pdf"])
        .add_conversion("svg", vec!["png", "jpg", "jpeg", "pdf"]);
        self.register(imagemagick);

        // GraphicsMagick - Image conversion (alternative)
        let graphicsmagick = Engine::new(
            "graphicsmagick",
            "GraphicsMagick",
            "Image format conversion using GraphicsMagick"
        )
        .add_conversion("png", vec!["jpg", "jpeg", "gif", "bmp", "tiff"])
        .add_conversion("jpg", vec!["png", "gif", "bmp", "tiff"])
        .add_conversion("jpeg", vec!["png", "gif", "bmp", "tiff"])
        .add_conversion("gif", vec!["png", "jpg", "jpeg", "bmp", "tiff"])
        .add_conversion("bmp", vec!["png", "jpg", "jpeg", "gif", "tiff"])
        .add_conversion("tiff", vec!["png", "jpg", "jpeg", "gif", "bmp"]);
        self.register(graphicsmagick);

        // LibreOffice - Document conversion
        let libreoffice = Engine::new(
            "libreoffice",
            "LibreOffice",
            "Document conversion using LibreOffice"
        )
        .add_conversion("docx", vec!["pdf", "odt", "html", "txt", "rtf"])
        .add_conversion("doc", vec!["pdf", "odt", "docx", "html", "txt", "rtf"])
        .add_conversion("odt", vec!["pdf", "docx", "html", "txt", "rtf"])
        .add_conversion("xlsx", vec!["pdf", "ods", "csv", "html"])
        .add_conversion("xls", vec!["pdf", "ods", "xlsx", "csv", "html"])
        .add_conversion("ods", vec!["pdf", "xlsx", "csv", "html"])
        .add_conversion("pptx", vec!["pdf", "odp", "html"])
        .add_conversion("ppt", vec!["pdf", "odp", "pptx", "html"])
        .add_conversion("odp", vec!["pdf", "pptx", "html"])
        .add_conversion("rtf", vec!["pdf", "docx", "odt", "html", "txt"]);
        self.register(libreoffice);

        // Pandoc - Document/Markup conversion
        let pandoc = Engine::new(
            "pandoc",
            "Pandoc",
            "Universal document converter"
        )
        .add_conversion("md", vec!["html", "pdf", "docx", "epub", "latex", "rst"])
        .add_conversion("markdown", vec!["html", "pdf", "docx", "epub", "latex", "rst"])
        .add_conversion("html", vec!["md", "markdown", "pdf", "docx", "epub", "latex"])
        .add_conversion("rst", vec!["html", "md", "markdown", "pdf", "docx", "latex"])
        .add_conversion("latex", vec!["html", "pdf", "docx"])
        .add_conversion("tex", vec!["html", "pdf", "docx"])
        .add_conversion("epub", vec!["html", "pdf", "docx", "md"])
        .add_conversion("docx", vec!["md", "markdown", "html", "pdf", "epub", "rst"]);
        self.register(pandoc);

        // Calibre - eBook conversion
        let calibre = Engine::new(
            "calibre",
            "Calibre",
            "eBook format conversion using Calibre"
        )
        .add_conversion("epub", vec!["mobi", "azw3", "pdf", "html", "txt"])
        .add_conversion("mobi", vec!["epub", "azw3", "pdf", "html", "txt"])
        .add_conversion("azw3", vec!["epub", "mobi", "pdf", "html", "txt"])
        .add_conversion("pdf", vec!["epub", "mobi", "html", "txt"]);
        self.register(calibre);

        // Inkscape - Vector graphics conversion
        let inkscape = Engine::new(
            "inkscape",
            "Inkscape",
            "Vector graphics conversion using Inkscape"
        )
        .add_conversion("svg", vec!["png", "pdf", "eps", "emf", "wmf"])
        .add_conversion("eps", vec!["svg", "png", "pdf"])
        .add_conversion("emf", vec!["svg", "png", "pdf"])
        .add_conversion("wmf", vec!["svg", "png", "pdf"]);
        self.register(inkscape);

        // resvg - SVG rendering
        let resvg = Engine::new(
            "resvg",
            "resvg",
            "High-quality SVG rendering"
        )
        .add_conversion("svg", vec!["png"]);
        self.register(resvg);

        // VIPS - High-performance image processing
        let vips = Engine::new(
            "vips",
            "libvips",
            "High-performance image processing with libvips"
        )
        .add_conversion("png", vec!["jpg", "jpeg", "webp", "tiff", "heif", "avif"])
        .add_conversion("jpg", vec!["png", "webp", "tiff", "heif", "avif"])
        .add_conversion("jpeg", vec!["png", "webp", "tiff", "heif", "avif"])
        .add_conversion("webp", vec!["png", "jpg", "jpeg", "tiff", "heif", "avif"])
        .add_conversion("tiff", vec!["png", "jpg", "jpeg", "webp", "heif", "avif"])
        .add_conversion("heif", vec!["png", "jpg", "jpeg", "webp", "tiff"])
        .add_conversion("avif", vec!["png", "jpg", "jpeg", "webp", "tiff"]);
        self.register(vips);

        // libheif - HEIF/HEIC conversion
        let libheif = Engine::new(
            "libheif",
            "libheif",
            "HEIF/HEIC image format conversion"
        )
        .add_conversion("heic", vec!["jpg", "jpeg", "png"])
        .add_conversion("heif", vec!["jpg", "jpeg", "png"]);
        self.register(libheif);

        // libjxl - JPEG XL conversion
        let libjxl = Engine::new(
            "libjxl",
            "libjxl",
            "JPEG XL image format conversion"
        )
        .add_conversion("jxl", vec!["jpg", "jpeg", "png"])
        .add_conversion("jpg", vec!["jxl"])
        .add_conversion("jpeg", vec!["jxl"])
        .add_conversion("png", vec!["jxl"]);
        self.register(libjxl);

        // Potrace - Bitmap to vector tracing
        let potrace = Engine::new(
            "potrace",
            "Potrace",
            "Bitmap to vector graphics tracing"
        )
        .add_conversion("bmp", vec!["svg", "eps", "pdf"])
        .add_conversion("png", vec!["svg", "eps", "pdf"])
        .add_conversion("pnm", vec!["svg", "eps", "pdf"]);
        self.register(potrace);

        // VTracer - Advanced bitmap tracing
        let vtracer = Engine::new(
            "vtracer",
            "VTracer",
            "Advanced raster to vector graphics conversion"
        )
        .add_conversion("png", vec!["svg"])
        .add_conversion("jpg", vec!["svg"])
        .add_conversion("jpeg", vec!["svg"])
        .add_conversion("bmp", vec!["svg"]);
        self.register(vtracer);

        // Dasel - Data format conversion
        let dasel = Engine::new(
            "dasel",
            "Dasel",
            "Data format conversion (JSON, YAML, TOML, XML)"
        )
        .add_conversion("json", vec!["yaml", "yml", "toml", "xml", "csv"])
        .add_conversion("yaml", vec!["json", "toml", "xml", "csv"])
        .add_conversion("yml", vec!["json", "toml", "xml", "csv"])
        .add_conversion("toml", vec!["json", "yaml", "yml", "xml"])
        .add_conversion("xml", vec!["json", "yaml", "yml"]);
        self.register(dasel);

        // Assimp - 3D model conversion
        let assimp = Engine::new(
            "assimp",
            "Assimp",
            "3D model format conversion"
        )
        .add_conversion("obj", vec!["fbx", "gltf", "glb", "stl", "ply", "3ds"])
        .add_conversion("fbx", vec!["obj", "gltf", "glb", "stl", "ply"])
        .add_conversion("gltf", vec!["obj", "fbx", "glb", "stl"])
        .add_conversion("glb", vec!["obj", "fbx", "gltf", "stl"])
        .add_conversion("stl", vec!["obj", "fbx", "gltf", "glb", "ply"])
        .add_conversion("3ds", vec!["obj", "fbx", "gltf", "glb"]);
        self.register(assimp);

        // XeLaTeX - LaTeX to PDF
        let xelatex = Engine::new(
            "xelatex",
            "XeLaTeX",
            "LaTeX document compilation"
        )
        .add_conversion("tex", vec!["pdf"])
        .add_conversion("latex", vec!["pdf"]);
        self.register(xelatex);

        // dvisvgm - DVI to SVG
        let dvisvgm = Engine::new(
            "dvisvgm",
            "dvisvgm",
            "DVI to SVG conversion"
        )
        .add_conversion("dvi", vec!["svg"]);
        self.register(dvisvgm);

        // msgconvert - Email conversion
        let msgconvert = Engine::new(
            "msgconvert",
            "msgconvert",
            "Outlook MSG to EML conversion"
        )
        .add_conversion("msg", vec!["eml"]);
        self.register(msgconvert);

        // VCF converter
        let vcf = Engine::new(
            "vcf",
            "VCF Converter",
            "vCard format conversion"
        )
        .add_conversion("vcf", vec!["csv", "json"]);
        self.register(vcf);

        // MarkItDown - Document to Markdown
        let markitdown = Engine::new(
            "markitdown",
            "MarkItDown",
            "Convert various documents to Markdown"
        )
        .add_conversion("pdf", vec!["md", "markdown"])
        .add_conversion("docx", vec!["md", "markdown"])
        .add_conversion("pptx", vec!["md", "markdown"])
        .add_conversion("xlsx", vec!["md", "markdown"])
        .add_conversion("html", vec!["md", "markdown"]);
        self.register(markitdown);
    }

    /// Register an engine
    pub fn register(&mut self, engine: Engine) {
        self.engines.insert(engine.id.clone(), engine);
    }

    /// Get an engine by ID
    pub fn get(&self, engine_id: &str) -> Option<&Engine> {
        self.engines.get(engine_id)
    }

    /// List all engines
    pub fn list(&self) -> Vec<&Engine> {
        self.engines.values().collect()
    }

    /// Get all engine info for API response
    pub fn list_info(&self) -> Vec<EngineInfo> {
        let mut engines: Vec<EngineInfo> = self.engines.values().map(|e| e.to_info()).collect();
        engines.sort_by(|a, b| a.id.cmp(&b.id));
        engines
    }

    /// Validate a conversion request
    /// Returns Ok if valid, or an error with suggestions if not
    pub fn validate_conversion(
        &self,
        engine_id: &str,
        from: &str,
        to: &str,
    ) -> Result<(), ApiError> {
        // Check if engine exists
        let engine = self.engines.get(engine_id).ok_or_else(|| {
            ApiError::EngineNotFound(engine_id.to_string())
        })?;

        // Check if conversion is supported
        if engine.supports_conversion(from, to) {
            return Ok(());
        }

        // Generate suggestions
        let suggestions = self.find_suggestions(from, to);

        Err(ApiError::UnsupportedConversion {
            engine: engine_id.to_string(),
            from: from.to_string(),
            to: to.to_string(),
            suggestions,
        })
    }

    /// Find alternative engines/formats that can handle a conversion
    pub fn find_suggestions(&self, from: &str, to: &str) -> Vec<ConversionSuggestion> {
        let from = from.to_lowercase();
        let to = to.to_lowercase();
        let mut suggestions = Vec::new();

        // First, find engines that support this exact conversion
        for engine in self.engines.values() {
            if engine.supports_conversion(&from, &to) {
                suggestions.push(ConversionSuggestion {
                    engine: engine.id.clone(),
                    from: from.clone(),
                    to: to.clone(),
                });
            }
        }

        // If no exact matches, find engines that support the input format
        if suggestions.is_empty() {
            for engine in self.engines.values() {
                if let Some(outputs) = engine.conversions.get(&from) {
                    for output in outputs {
                        suggestions.push(ConversionSuggestion {
                            engine: engine.id.clone(),
                            from: from.clone(),
                            to: output.clone(),
                        });
                    }
                }
            }
        }

        // Limit suggestions
        suggestions.truncate(10);
        suggestions
    }

    /// Check if any engine supports a given input format
    pub fn has_input_format(&self, format: &str) -> bool {
        let format = format.to_lowercase();
        self.engines.values().any(|e| e.conversions.contains_key(&format))
    }

    /// Get all engines that support a given input format
    pub fn engines_for_input(&self, format: &str) -> Vec<&Engine> {
        let format = format.to_lowercase();
        self.engines
            .values()
            .filter(|e| e.conversions.contains_key(&format))
            .collect()
    }
}

impl Default for EngineRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_creation() {
        let engine = Engine::new("test", "Test Engine", "A test engine")
            .add_conversion("png", vec!["jpg", "gif"])
            .add_conversion("jpg", vec!["png"]);

        assert_eq!(engine.id, "test");
        assert!(engine.supports_conversion("png", "jpg"));
        assert!(engine.supports_conversion("png", "gif"));
        assert!(engine.supports_conversion("jpg", "png"));
        assert!(!engine.supports_conversion("gif", "png"));
    }

    #[test]
    fn test_engine_case_insensitive() {
        let engine = Engine::new("test", "Test", "Test")
            .add_conversion("PNG", vec!["JPG"]);

        assert!(engine.supports_conversion("png", "jpg"));
        assert!(engine.supports_conversion("PNG", "JPG"));
        assert!(engine.supports_conversion("Png", "Jpg"));
    }

    #[test]
    fn test_registry_default_engines() {
        let registry = EngineRegistry::new();
        
        assert!(registry.get("ffmpeg").is_some());
        assert!(registry.get("imagemagick").is_some());
        assert!(registry.get("libreoffice").is_some());
        assert!(registry.get("pandoc").is_some());
    }

    #[test]
    fn test_registry_validation_success() {
        let registry = EngineRegistry::new();
        
        assert!(registry.validate_conversion("ffmpeg", "mp4", "webm").is_ok());
        assert!(registry.validate_conversion("imagemagick", "png", "jpg").is_ok());
    }

    #[test]
    fn test_registry_validation_engine_not_found() {
        let registry = EngineRegistry::new();
        
        let result = registry.validate_conversion("nonexistent", "png", "jpg");
        assert!(matches!(result, Err(ApiError::EngineNotFound(_))));
    }

    #[test]
    fn test_registry_validation_unsupported_with_suggestions() {
        let registry = EngineRegistry::new();
        
        // FFmpeg doesn't support png to jpg
        let result = registry.validate_conversion("ffmpeg", "png", "jpg");
        
        if let Err(ApiError::UnsupportedConversion { suggestions, .. }) = result {
            // Should suggest imagemagick or vips for png to jpg
            assert!(!suggestions.is_empty());
            assert!(suggestions.iter().any(|s| s.engine == "imagemagick" || s.engine == "vips"));
        } else {
            panic!("Expected UnsupportedConversion error");
        }
    }

    #[test]
    fn test_find_suggestions() {
        let registry = EngineRegistry::new();
        
        let suggestions = registry.find_suggestions("png", "jpg");
        assert!(!suggestions.is_empty());
        
        // Should include engines that support png to jpg
        let has_imagemagick = suggestions.iter().any(|s| s.engine == "imagemagick");
        assert!(has_imagemagick);
    }

    #[test]
    fn test_list_info() {
        let registry = EngineRegistry::new();
        let info = registry.list_info();
        
        assert!(!info.is_empty());
        assert!(info.iter().any(|e| e.id == "ffmpeg"));
    }
}
