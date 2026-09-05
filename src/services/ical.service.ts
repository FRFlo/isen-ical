import {
	Address,
	parseAurionPlanningTitle,
	parseLocationToAddress,
	type AurionPlanningEvent,
} from "aurion-sdk";

export interface ICalEvent {
	uid: string;
	summary: string;
	description?: string;
	location?: string;
	url?: string;
	dtstart: Date;
	dtend: Date;
}

export class ICalService {
	private formatDateUTC(date: Date): string {
		const pad = (n: number) => n.toString().padStart(2, "0");
		const year = date.getUTCFullYear();
		const month = pad(date.getUTCMonth() + 1);
		const day = pad(date.getUTCDate());
		const hours = pad(date.getUTCHours());
		const minutes = pad(date.getUTCMinutes());
		const seconds = pad(date.getUTCSeconds());
		return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
	}

	private foldLine(line: string): string {
		const maxLength = 75;
		const continuationLength = 74;

		const getByteLength = (str: string): number => {
			return new TextEncoder().encode(str).length;
		};

		const byteLength = getByteLength(line);
		if (byteLength <= maxLength) return line;

		const chunks: string[] = [];
		let currentPos = 0;
		const lineBytes = new TextEncoder().encode(line);

		while (currentPos < lineBytes.length) {
			const remainingBytes = lineBytes.length - currentPos;
			const chunkLength = currentPos === 0 ? maxLength : continuationLength;
			const actualChunkLength = Math.min(chunkLength, remainingBytes);

			const chunkBytes = lineBytes.slice(currentPos, currentPos + actualChunkLength);
			const chunk = new TextDecoder().decode(chunkBytes);
			chunks.push(chunk);

			currentPos += actualChunkLength;
		}

		return chunks.join("\r\n ");
	}

	private escapeText(text: string): string {
		return text
			.replace(/\\/g, "\\\\")
			.replace(/,/g, "\\,")
			.replace(/;/g, "\\;")
			.replace(/\n/g, "\\n");
	}

	private normalizeSpaces(text: string): string {
		return text.replace(/\s+/g, " ").trim();
	}

	generateEvent(event: ICalEvent): string[] {
		const lines = [
			"BEGIN:VEVENT",
			`UID:${event.uid}`,
			`DTSTAMP:${this.formatDateUTC(new Date())}`,
			`DTSTART:${this.formatDateUTC(event.dtstart)}`,
			`DTEND:${this.formatDateUTC(event.dtend)}`,
			`SUMMARY:${this.escapeText(event.summary)}`,
		];

		if (event.location) {
			lines.push(`LOCATION:${this.escapeText(event.location)}`);
		}

		if (event.url) {
			lines.push(`URL:${this.escapeText(event.url)}`);
		}

		if (event.description) {
			lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
		}

		lines.push("END:VEVENT");

		return lines;
	}

	generate(events: ICalEvent[]): string {
		const allLines: string[] = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//ISEN-ICAL//isen-ical//EN",
			"CALSCALE:GREGORIAN",
			"METHOD:PUBLISH",
			`X-WR-CALNAME:Aurion`,
			"X-WR-TIMEZONE:Europe/Paris",
		];

		for (const event of events) {
			const eventLines = this.generateEvent(event);
			allLines.push(...eventLines);
		}

		allLines.push("END:VCALENDAR");

		const resultLines: string[] = [];
		for (const line of allLines) {
			const folded = this.foldLine(line);
			const foldedParts = folded.split("\r\n");
			resultLines.push(...foldedParts);
		}

		return resultLines.join("\r\n");
	}

	/**
	 * Aurion title format: "Location\nAdditionalInfo\nSubject\nCourseType\nProfessor"
	 * All fields are optional and may be empty.
	 */
	private parseAurionTitle(title: string): {
		summary: string;
		location?: string;
		description?: string;
	} {
		const { location, additionalInfo, subject, courseType, professor } =
			parseAurionPlanningTitle(title);

		let summary = subject || courseType || location || additionalInfo || "Événement sans titre";

		if (courseType === "EXAM_SURV") {
			summary = `🎓 ${summary}`;
		} else if (courseType === "AUTO_APPR") {
			summary = `🏠 ${summary}`;
		}

		summary = this.normalizeSpaces(summary);

		let locationAddress: Address | undefined = undefined;
		try {
			locationAddress = location ? parseLocationToAddress(location) : undefined;
		} catch {}

		const descriptionLines: string[] = [];
		if (additionalInfo) {
			descriptionLines.push(additionalInfo, "");
		}
		if (professor) {
			descriptionLines.push(`Professeur: ${professor}`);
		}
		if (courseType) {
			descriptionLines.push(`Type de cours: ${courseType}`);
		}

		return {
			summary,
			location: [
				location ? this.normalizeSpaces(location) : undefined,
				locationAddress
					? `${locationAddress.street}, ${locationAddress.postalCode} ${locationAddress.city}`
					: undefined,
			]
				.filter((v): v is string => !!v)
				.join(" - "),
			description: descriptionLines.length > 0 ? descriptionLines.join("\n") : undefined,
		};
	}

	fromAurionEvents(aurionEvents: AurionPlanningEvent[], fetchDate: Date = new Date()): string {
		const icalEvents: ICalEvent[] = aurionEvents.map((event) => {
			const parsed = this.parseAurionTitle(event.title);
			return {
				uid: `${event.id}@isen-ical`,
				summary: parsed.summary,
				location: parsed.location,
				description: parsed.description,
				dtstart: event.start,
				dtend: event.end,
			};
		});

		const fetchStart = new Date(Math.floor(fetchDate.getTime() / 60000) * 60000);
		const fetchEnd = new Date(fetchStart.getTime() + 60 * 60 * 1000);

		const migrationNoticeEvent: ICalEvent = {
			uid: "migration-notice-naurio@isen-ical",
			summary: "⚠️ Service déprécié - Migrez vers Naurio",
			location: "https://naurio.fds.ovh/planning?ical=true",
			url: "https://naurio.fds.ovh/planning?ical=true",
			description:
				"Le service isen-ical est désormais déprécié au profit de Naurio.\n\nVeuillez migrer dès maintenant vers le nouveau service pour continuer à synchroniser votre planning :\nhttps://naurio.fds.ovh/planning?ical=true",
			dtstart: fetchStart,
			dtend: fetchEnd,
		};

		icalEvents.unshift(migrationNoticeEvent);

		return this.generate(icalEvents);
	}
}
