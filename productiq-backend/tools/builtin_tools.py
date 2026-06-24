"""
ProductIQ — Builtin CrewAI Tools Registry
Pre-built tool wrappers from crewai-tools for optional use by agents.
"""

from crewai_tools import (
    DirectoryReadTool,
    FileReadTool,
    CodeDocsSearchTool,
    CSVSearchTool,
    JSONSearchTool,
    RagTool,
    ScrapeWebsiteTool,
    TXTSearchTool,
    WebsiteSearchTool,
    GithubSearchTool,
    YoutubeChannelSearchTool,
    YoutubeVideoSearchTool,
    DOCXSearchTool,
    MDXSearchTool,
)
from config import settings


# Web Search Tools
def create_google_search_tool():
    """Create Google search tool using SerpAPI"""
    if not settings.SERPAPI_KEY:
        return None
    try:
        from crewai_tools import SerpApiGoogleSearchTool
        return SerpApiGoogleSearchTool(api_key=settings.SERPAPI_KEY)
    except ImportError:
        return None


def create_website_search_tool():
    """Create website search tool"""
    return WebsiteSearchTool()


# Web Scraping Tools
def create_website_scraper_tool():
    """Create website scraping tool"""
    return ScrapeWebsiteTool()


# File System Tools
def create_directory_read_tool():
    """Create directory reading tool"""
    return DirectoryReadTool()


def create_file_read_tool():
    """Create file reading tool"""
    return FileReadTool()


# Data Search Tools
def create_csv_search_tool(csv_file_path: str):
    """Create CSV search tool for a specific file"""
    return CSVSearchTool(csv_file_path=csv_file_path)


def create_json_search_tool(json_file_path: str):
    """Create JSON search tool for a specific file"""
    return JSONSearchTool(json_file_path=json_file_path)


def create_txt_search_tool(txt_file_path: str):
    """Create text file search tool"""
    return TXTSearchTool(txt_file_path=txt_file_path)


# Database Tools
def create_pg_search_tool():
    """Create PostgreSQL search tool"""
    # This would need database connection details
    # For now, return None as we use Supabase
    return None


# RAG Tools
def create_rag_tool():
    """Create RAG tool for vector search"""
    # This would be configured with our vector store
    return RagTool()


# Code and Documentation Tools
def create_code_docs_search_tool():
    """Create code documentation search tool"""
    return CodeDocsSearchTool()


# Social Media Tools
def create_github_search_tool():
    """Create GitHub search tool"""
    return GithubSearchTool()


def create_youtube_channel_search_tool():
    """Create YouTube channel search tool"""
    return YoutubeChannelSearchTool()


def create_youtube_video_search_tool():
    """Create YouTube video search tool"""
    return YoutubeVideoSearchTool()


# NLP Tools
def create_sentiment_analysis_tool():
    """Create sentiment analysis tool using RAG"""
    return RagTool()  # Using RAG for text analysis


def create_text_summarizer_tool():
    """Create text summarization tool using RAG"""
    return RagTool()  # Using RAG for summarization


def create_text_classifier_tool():
    """Create text classification tool using RAG"""
    return RagTool()  # Using RAG for classification


# Additional Search Tools
def create_docx_search_tool(docx_file_path: str = None):
    """Create DOCX search tool"""
    if docx_file_path:
        return DOCXSearchTool(docx_file_path=docx_file_path)
    return DOCXSearchTool()


def create_md_search_tool(md_file_path: str = None):
    """Create Markdown search tool"""
    if md_file_path:
        return MDXSearchTool(md_file_path=md_file_path)
    return MDXSearchTool()


# Tool Registry - Easy access to all builtin tools
BUILTIN_TOOLS = {
    # Web tools
    'google_search': create_google_search_tool,
    'website_search': create_website_search_tool,
    'website_scraper': create_website_scraper_tool,

    # File system tools
    'directory_read': create_directory_read_tool,
    'file_read': create_file_read_tool,

    # Data tools
    'csv_search': create_csv_search_tool,
    'json_search': create_json_search_tool,
    'txt_search': create_txt_search_tool,
    'docx_search': create_docx_search_tool,
    'md_search': create_md_search_tool,

    # Database tools
    'pg_search': create_pg_search_tool,

    # RAG tools
    'rag': create_rag_tool,

    # NLP tools
    'sentiment_analysis': create_sentiment_analysis_tool,
    'text_summarizer': create_text_summarizer_tool,
    'text_classifier': create_text_classifier_tool,

    # Code tools
    'code_docs_search': create_code_docs_search_tool,

    # Social tools
    'github_search': create_github_search_tool,
    'youtube_channel_search': create_youtube_channel_search_tool,
    'youtube_video_search': create_youtube_video_search_tool,
}


def get_builtin_tool(tool_name: str, **kwargs):
    """
    Get a builtin tool by name with optional configuration

    Args:
        tool_name: Name of the tool to create
        **kwargs: Additional configuration for the tool

    Returns:
        Configured tool instance or None if not available
    """
    if tool_name not in BUILTIN_TOOLS:
        return None

    try:
        tool_func = BUILTIN_TOOLS[tool_name]
        return tool_func(**kwargs)
    except Exception as e:
        print(f"Error creating builtin tool {tool_name}: {e}")
        return None


def get_available_builtin_tools():
    """
    Get all available builtin tools that can be created

    Returns:
        Dict of tool_name -> tool_instance (or None if not available)
    """
    available_tools = {}
    for tool_name, tool_func in BUILTIN_TOOLS.items():
        try:
            tool = tool_func()
            if tool is not None:
                available_tools[tool_name] = tool
        except Exception:
            continue
    return available_tools