from crewai import Task
from agents.scraper_agent import create_scraper_agent

def create_scraper_task(agent, product_category: str, brand_name: str, run_id: str) -> Task:
    return Task(
        description=(
            f"Scrape comprehensive product data from Amazon India, Flipkart, and D2C brand sites "
            f"for the product category: {product_category}. Focus on products from brand: {brand_name or product_category}. "
            f"Extract: product names, prices (MRP and selling), ratings, specifications, seller information, "
            f"and product images. Store all structured data in Supabase with run_id: {run_id}."
        ),
        expected_output=(
            "A comprehensive JSON array of product data with the following structure: "
            "[{product_name, brand, category, price_inr, mrp_inr, rating, platform, seller_info, specs, image_urls}]"
        ),
        agent=agent,
        context=[product_category, brand_name, run_id]
    )