import SimpleYoutubeReferencer from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SYRSettingsTab extends PluginSettingTab {
    plugin: SimpleYoutubeReferencer;

    constructor(app: App, plugin: SimpleYoutubeReferencer) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("YouTube API Key")
            .setDesc("Enter your YouTube Data API Key.")
            .addText((text) =>
                text
                    .setPlaceholder("Your API Key")
                    .setValue(this.plugin.settings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.apiKey = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl('b', {
            text: "Don't have one? "
        }).createEl('a', {
            text: 'Create an API Key',
            href: 'https://developers.google.com/youtube/v3/getting-started',
            target: '_blank',
            cls: 'hyperlink'
        });


        new Setting(containerEl)
            .setName("Include Channel")
            .setDesc("Include channel name in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.includeChannel)
                    .onChange(async (value) => {
                        this.plugin.settings.includeChannel = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Include Title")
            .setDesc("Include video title in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.includeTitle)
                    .onChange(async (value) => {
                        this.plugin.settings.includeTitle = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Include Thumbnail URL")
            .setDesc("Include video thumbnail URL in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.includeThumbnailURL)
                    .onChange(async (value) => {
                        this.plugin.settings.includeThumbnailURL = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Include Published At")
            .setDesc("Include video published date in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.includePublishedAt)
                    .onChange(async (value) => {
                        this.plugin.settings.includePublishedAt = value;
                        await this.plugin.saveSettings();
                    })
            );

        const includeDescriptionSetting = new Setting(containerEl)
            .setName("Include Description")
            .setDesc("Include video description in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.includeDescription)
                    .onChange(async (value) => {
                        this.plugin.settings.includeDescription = value;
                        await this.plugin.saveSettings();

                        // Enable/disable or hide Format Description to One Line setting based on Include Description setting
                        if (value) {
                            formatDescriptionSetting.settingEl.style.display = '';
                            warningEl.style.display = '';
                        } else {
                            formatDescriptionSetting.settingEl.style.display = 'none';
                            warningEl.style.display = 'none';
                        }
                        
                    })
            );

        const formatDescriptionSetting = new Setting(containerEl)
            .setName("Format Description to One Line")
            .setDesc("Format the video description to one line in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.formatDescriptionToOneLine)
                    .onChange(async (value) => {
                        this.plugin.settings.formatDescriptionToOneLine = value;
                        await this.plugin.saveSettings();
                    })
            );

        const warningEl = containerEl.createEl('div');
        warningEl.textContent = 'Warning: Turning off "Format Description to One Line" might break YAML frontmatter if description contains multiple lines.';
        warningEl.classList.add('setting-item-description');
        warningEl.style.display = '';
        warningEl.style.color = 'red';

        new Setting(containerEl)
            .setName("Include Video Tags")
            .setDesc("Include video tags in frontmatter")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.includeVideoTags)
                    .onChange(async (value) => {
                        this.plugin.settings.includeVideoTags = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Hide Format Description to One Line setting by default if Include Description is turned off
        if (!this.plugin.settings.includeDescription) {
            formatDescriptionSetting.settingEl.style.display = 'none';
            warningEl.style.display = 'none';
        }
    }
}
