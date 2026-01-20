export class PageParserService {
  static parseViewState(body: string): string {
    const match = body.match(
      /<input type="hidden" name="javax.faces.ViewState" id="j_id1:javax.faces.ViewState:0" value="([^"]+)" autocomplete="off" \/>/
    );
    if (!match?.[1]) throw new Error('ViewState not found');
    return match[1];
  }

  static parseIdInit(body: string): string {
    const from = 'name="form:idInit" value="';
    const startIndex = body.indexOf(from);
    if (startIndex === -1) throw new Error('idInit not found');
    const idxTo = body.indexOf('"', startIndex + from.length);
    return body.substring(startIndex + from.length, idxTo);
  }

  static parseSidebarMenuIdForMonPlanning(body: string): string {
    const regex =
      /onclick="[^"]*?PrimeFaces\.addSubmitParam\('form',\{'form:sidebar':'form:sidebar','form:sidebar_menuid':'(\d+)'\}[^"]*?"[^>]*?>[^<]*<span class="ui-menuitem-icon ui-icon fa fa-calendar-alt"><\/span><span class="ui-menuitem-text">Mon Planning<\/span>/;
    const match = body.match(regex);
    if (!match?.[1]) {
      throw new Error('Sidebar menu id for Mon Planning not found');
    }
    return match[1];
  }

  static parseFormIdPlanning(body: string): string {
    const regex = /PrimeFaces\.cw\("Schedule","schedule",\{id:"([^"]+)"/;
    const match = body.match(regex);
    if (!match?.[1]) {
      throw new Error('FormIdPlanning not found');
    }
    return match[1];
  }

  static parsePlanningData(body: string): AurionEvent[] {
    const match = body.match(/\[\{"id"(.*?)]]/);
    if (!match) {
      throw new Error('Planning data not found in response');
    }
    const data = match[0].slice(0, -3);
    return JSON.parse(data) as AurionEvent[];
  }
}

export interface AurionEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  editable: boolean;
  className: string;
}
