import foodOrderingHero from "./assets/food-ordering-hero.png";
import burgersImage from "./assets/product-burgers.png";
import drinksImage from "./assets/product-drinks.png";
import pizzaImage from "./assets/product-pizza.png";
import sidesImage from "./assets/product-sides.png";

export function productImage(name: string, category = ""): string {
  const searchText = `${name} ${category}`.toLowerCase();
  if (searchText.includes("pizza")) return pizzaImage;
  if (searchText.includes("fries") || searchText.includes("side")) return sidesImage;
  if (/pepsi|coke|sprite|drink|cola|soda/.test(searchText)) return drinksImage;
  if (searchText.includes("burger")) return burgersImage;
  return foodOrderingHero;
}
