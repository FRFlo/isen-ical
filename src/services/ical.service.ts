import type { AurionEvent } from "./aurion.service";

export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
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
    if (line.length <= 75) return line;

    const chunks: string[] = [];
    chunks.push(line.slice(0, 75));
    let pos = 75;
    while (pos < line.length) {
      chunks.push(" " + line.slice(pos, pos + 74));
      pos += 74;
    }
    return chunks.join("\r\n");
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  }

  generateEvent(event: ICalEvent): string {
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

    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    lines.push("END:VEVENT");

    return lines.map((line) => this.foldLine(line)).join("\r\n");
  }

  generate(events: ICalEvent[], calendarName = "ISEN Calendar"): string {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ISEN-ICAL//isen-ical//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${this.escapeText(calendarName)}`,
      "X-WR-TIMEZONE:Europe/Paris",
    ];

    for (const event of events) {
      lines.push(this.generateEvent(event));
    }

    lines.push("END:VCALENDAR");

    return lines.map((line) => this.foldLine(line)).join("\r\n");
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
    const rawParts = title.split("\n").map((p) => p.trim());
    const [location, additionalInfo, subject, courseType, professor] = rawParts;

    const summary =
      subject ||
      courseType ||
      location ||
      additionalInfo ||
      "Événement sans titre";

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
      location: location || undefined,
      description:
        descriptionLines.length > 0 ? descriptionLines.join("\n") : undefined,
    };
  }

  private parseAurionDate(dateValue: string | number): Date {
    if (typeof dateValue === "number") {
      return new Date(dateValue);
    }

    const asNumber = Number(dateValue);
    if (!isNaN(asNumber) && dateValue.match(/^\d+$/)) {
      return new Date(asNumber);
    }

    return new Date(dateValue);
  }

  fromAurionEvents(aurionEvents: AurionEvent[], username: string): string {
    const icalEvents: ICalEvent[] = aurionEvents.map((event) => {
      const parsed = this.parseAurionTitle(event.title);
      return {
        uid: `${event.id}@isen-ical`,
        summary: parsed.summary,
        location: parsed.location,
        description: parsed.description,
        dtstart: this.parseAurionDate(event.start),
        dtend: this.parseAurionDate(event.end),
      };
    });

    return this.generate(icalEvents, `${username}'s ISEN Calendar`);
  }

  generatePlaceholder(username: string): string {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const placeholderEvent: ICalEvent = {
      uid: `placeholder-${username}@isen-ical`,
      summary: "Sample Event",
      description: `This is a placeholder event for ${username}`,
      dtstart: now,
      dtend: oneHourLater,
    };

    return this.generate([placeholderEvent], `${username}'s Calendar`);
  }
}
