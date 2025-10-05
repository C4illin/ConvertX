import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

export const generateTailwind = async () => {
  const result = await Bun.file("./src/main.css")
    .text()
    .then((sourceText) => {
      return postcss([tailwind]).process(sourceText, {
        from: "./src/main.css",
        to: "./public/generated.css",
      });
    });

  return result;
};
