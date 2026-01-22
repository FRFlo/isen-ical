import { HOMEPAGE_TEMPLATE } from '../templates/homepage.template';

export interface TemplateVariables {
  [key: string]: string;
}

export enum TemplateName {
  HOMEPAGE = 'homepage',
}

const TEMPLATES: Record<TemplateName, string> = {
  [TemplateName.HOMEPAGE]: HOMEPAGE_TEMPLATE,
};

export class TemplateService {
  static render(template: string, variables: TemplateVariables): string {
    let rendered = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    
    return rendered;
  }

  static renderTemplate(
    templateName: TemplateName,
    variables: TemplateVariables
  ): string {
    const template = TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    return this.render(template, variables);
  }
}
