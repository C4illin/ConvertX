import { properties, convert } from "./sharp";

export async function mainConverter(
	inputFilePath: string,
	fileType: string,
	convertTo: string,
	targetPath: string,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	options?: any,
) {
	// Check if the fileType and convertTo are supported by the sharp converter
	if (properties.from.includes(fileType) && properties.to.includes(convertTo)) {
		// Use the sharp converter
		try {
			await convert(inputFilePath, fileType, convertTo, targetPath, options);
			console.log(
				`Converted ${inputFilePath} from ${fileType} to ${convertTo} successfully.`,
			);
		} catch (error) {
			console.error(
				`Failed to convert ${inputFilePath} from ${fileType} to ${convertTo}.`,
				error,
			);
		}
	} else {
		console.log(
			`The sharp converter does not support converting from ${fileType} to ${convertTo}.`,
		);
	}
}

export function possibleConversions(fileType: string) {
	// Check if the fileType is supported by the sharp converter
	if (properties.from.includes(fileType)) {
		return properties.to;
	}

	return [];
}
