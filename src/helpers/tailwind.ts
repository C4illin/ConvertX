import tw from "tailwindcss";
import postcss from "postcss";

export const generateTailwind = async () => {
  const result = await Bun.file("./src/main.css")
    .text()
    .then((sourceText) => {
      const config = "./tailwind.config.js";

      return postcss([tw(config)]).process(sourceText, {
        from: "./src/main.css",
        to: "./public/generated.css",
      });
    });

  return result;
};
