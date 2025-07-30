import { Elysia, t } from "elysia";
import { getAllTargets, getAllInputs, getPossibleTargets } from "../../converters/main";

export const converters = new Elysia({ prefix: "/converters" })
  .get(
    "/",
    () => {
      const allTargets = getAllTargets();
      const converterList = Object.entries(allTargets).map(([name, outputs]) => ({
        name,
        outputs: [...new Set(outputs)].sort(),
        inputs: [...new Set(getAllInputs(name))].sort(),
      }));

      return {
        success: true,
        data: {
          converters: converterList,
          total: converterList.length,
        },
      };
    },
    {
      detail: {
        tags: ["converters"],
        summary: "List all converters",
        description: "Get a list of all available file converters with their supported input and output formats",
        responses: {
          200: {
            description: "List of converters",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        converters: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", example: "ffmpeg" },
                              outputs: {
                                type: "array",
                                items: { type: "string" },
                                example: ["mp4", "webm", "mp3"],
                              },
                              inputs: {
                                type: "array",
                                items: { type: "string" },
                                example: ["avi", "mov", "mkv"],
                              },
                            },
                          },
                        },
                        total: { type: "number", example: 17 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  )
  .get(
    "/:name",
    ({ params: { name }, set }) => {
      const allTargets = getAllTargets();
      
      if (!allTargets[name]) {
        set.status = 404;
        return {
          success: false,
          error: "Converter not found",
          code: "CONVERTER_NOT_FOUND",
        };
      }

      const outputs = [...new Set(allTargets[name])].sort();
      const inputs = [...new Set(getAllInputs(name))].sort();

      return {
        success: true,
        data: {
          converter: {
            name,
            outputs,
            inputs,
            totalFormats: inputs.length + outputs.length,
          },
        },
      };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      detail: {
        tags: ["converters"],
        summary: "Get converter details",
        description: "Get detailed information about a specific converter",
        responses: {
          200: {
            description: "Converter details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        converter: {
                          type: "object",
                          properties: {
                            name: { type: "string", example: "ffmpeg" },
                            outputs: {
                              type: "array",
                              items: { type: "string" },
                            },
                            inputs: {
                              type: "array",
                              items: { type: "string" },
                            },
                            totalFormats: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    }
  )
  .get(
    "/formats/:format",
    ({ params: { format }, set }) => {
      const possibleTargets = getPossibleTargets(format);
      
      if (!possibleTargets || Object.keys(possibleTargets).length === 0) {
        set.status = 404;
        return {
          success: false,
          error: "No converters support this format",
          code: "FORMAT_NOT_SUPPORTED",
        };
      }

      const converters = Object.entries(possibleTargets).map(([converter, outputs]) => ({
        converter,
        outputs: outputs.sort(),
      }));

      return {
        success: true,
        data: {
          format,
          converters,
          totalConverters: converters.length,
        },
      };
    },
    {
      params: t.Object({
        format: t.String(),
      }),
      detail: {
        tags: ["converters"],
        summary: "Get converters for format",
        description: "Find which converters can process a specific input format",
        responses: {
          200: {
            description: "Available converters for the format",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        format: { type: "string", example: "pdf" },
                        converters: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              converter: { type: "string", example: "libreoffice" },
                              outputs: {
                                type: "array",
                                items: { type: "string" },
                                example: ["docx", "html", "txt"],
                              },
                            },
                          },
                        },
                        totalConverters: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "Format not supported",
          },
        },
      },
    }
  );