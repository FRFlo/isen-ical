import type { AurionEvent } from './aurion.service';

export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Date;
  dtend: Date;
}

export class ICalService {
  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n');
  }

  generateEvent(event: ICalEvent): string {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART:${this.formatDate(event.dtstart)}`,
      `DTEND:${this.formatDate(event.dtend)}`,
      `SUMMARY:${this.escapeText(event.summary)}`,
    ];

    if (event.location) {
      lines.push(`LOCATION:${this.escapeText(event.location)}`);
    }

    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    lines.push('END:VEVENT');

    return lines.join('\r\n');
  }

  generate(events: ICalEvent[], calendarName = 'ISEN Calendar'): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ISEN-ICAL//isen-ical//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(calendarName)}`,
    ];

    for (const event of events) {
      lines.push(this.generateEvent(event));
    }

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Aurion title format: "Location\nAdditionalInfo\nSubject\nCourseType\nProfessor"
   */
  private parseAurionTitle(title: string): {
    summary: string;
    location?: string;
    description?: string;
  } {
    const parts = title.split('\n').map((p) => p.trim()).filter(Boolean);

    if (parts.length >= 5) {
      const [location, additionalInfo, subject, courseType, professor] = parts;
      return {
        summary: subject,
        location,
        description: [courseType, professor, additionalInfo].filter(Boolean).join(' - '),
      };
    }

    if (parts.length >= 3) {
      return {
        summary: parts[2] || parts[0],
        location: parts[0],
        description: parts.slice(3).join(' - '),
      };
    }

    return {
      summary: parts[0] || title,
      location: parts[1],
    };
  }

  fromAurionEvents(aurionEvents: AurionEvent[], username: string): string {
    const icalEvents: ICalEvent[] = aurionEvents.map((event) => {
      const parsed = this.parseAurionTitle(event.title);
      return {
        uid: `${event.id}@isen-ical`,
        summary: parsed.summary,
        location: parsed.location,
        description: parsed.description,
        dtstart: new Date(event.start),
        dtend: new Date(event.end),
      };
    });

    return this.generate(icalEvents, `${username}'s ISEN Calendar`);
  }

  generatePlaceholder(username: string): string {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const placeholderEvent: ICalEvent = {
      uid: `placeholder-${username}@isen-ical`,
      summary: 'Sample Event',
      description: `This is a placeholder event for ${username}`,
      dtstart: now,
      dtend: oneHourLater,
    };

    return this.generate([placeholderEvent], `${username}'s Calendar`);
  }
}
