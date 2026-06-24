"""
ProductIQ — Agent 1: E-Commerce Product Intelligence Scraper
"""

from crewai import Agent
from agents.base import GEMINI_FLASH
from tools.scraping_tools import AmazonScraperTool, FlipkartScraperTool, ApifyWebBrowserTool
from tools.storage_tools import SupabaseStoreTool


def create_scraper_agent() -> Agent:
    return Agent(
        role="E-Commerce Product Intelligence Scraper",
        goal=(
            "Scrape comprehensive product data — names, prices, ratings, specs, images, "
            "seller info — from Amazon India, Flipkart, and D2C brand sites for the given "
            "product category. Store all structured data in Supabase."
        ),
        backstory=(
            "You are a specialist in extracting structured product data from Indian e-commerce "
            "platforms. You handle pagination, dynamic JavaScript rendering, and anti-bot measures. "
            "You output clean, validated JSON that downstream agents depend on. You never skip a "
            "product if it has a name and price — volume matters."
        ),
        tools=[
            AmazonScraperTool(),
            FlipkartScraperTool(),
            ApifyWebBrowserTool(),
            SupabaseStoreTool(),
        ],
        llm=GEMINI_FLASH(),
        verbose=True,
        allow_delegation=False,
        max_retry_limit=3,
    )