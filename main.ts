import { Plugin, TFile, Notice } from "obsidian";
import axios from "axios";
import { SYRSettingsTab } from "./settings";

interface SYRSettings {
    apiKey: string;
    includeChannel: boolean;
    includeTitle: boolean;
    includeThumbnailURL: boolean;
    includePublishedAt: boolean;
    includeChannelId: boolean;
    includeDefaultAudioLanguage: boolean;
    includeDescription: boolean;
    formatDescriptionToOneLine: boolean;
	includeVideoTags: boolean;
}
 
const DEFAULT_SETTINGS: Partial<SYRSettings> = {
    apiKey: "",
    includeChannel: true,
    includeTitle: true,
    includeThumbnailURL: false,
    includePublishedAt: true,
    includeChannelId: false,
    includeDefaultAudioLanguage: false,
    includeDescription: false,
    formatDescriptionToOneLine: true, 
	includeVideoTags: false,
};

export default class SimpleYoutubeReferencer extends Plugin {
    settings: SYRSettings;

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new SYRSettingsTab(this.app, this));

        this.addCommand({
            id: "get-video-info",
            name: "Update Frontmatter with Video Details",
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && activeFile.extension === "md") {
                    this.updateDetailsInFrontMatter(activeFile);
                } else {
                    // No active Markdown file found.
                }
            },
        });
    }

    async updateDetailsInFrontMatter(file: TFile) {
        const apiKey = this.settings.apiKey;
        if (!apiKey) {
            new Notice("Please enter your YouTube Data API Key in settings.");
            return;
        }

        const content = await this.app.vault.read(file);
		const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|playlist\?|watch\?v=|watch\?.+(?:&|&);v=))(?<videoID>[a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&)index=((?:\d){1,3}))?(?:(?:\?|&|&)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/g

        const match = regex.exec(content);[1]
		console.log(match);
		
        if (match) {
			let videoID = match.groups.videoID;
            try {
                const [channelName, videoTitle, videoThumbnailURL, videoPublishedAt, channelId, defaultAudioLanguage, description, videoTags] = await this.getVideoDetails(videoID, apiKey);
				
                let newContent = content;
                const frontmatter = this.parseFrontmatter(content);

                newContent = this.updateContent(content, frontmatter, channelName, videoTitle, videoThumbnailURL, videoPublishedAt, channelId, defaultAudioLanguage, description, videoTags);

                await this.app.vault.modify(file, newContent);
                new Notice("Channel and video details updated.");
            } catch (error) {
                console.error("Error updating properties:", error);
                new Notice("Error updating properties. Please check your YouTube Data API Key or try again later.");
            }
        } else {
            new Notice("No YouTube link found in the file.");
        }
    }

	private parseFrontmatter(content: string): Record<string, string | string[]> {
		const lines = content.split("\n");
		const frontmatter: Record<string, string | string[]> = {};
		let inFrontmatter = false;
		let currentArrayKey: string | null = null;
		let currentArray: string[] = [];
		
		for (const line of lines) {
			if (line.trim() === "---") {
				inFrontmatter = !inFrontmatter;
			} else if (inFrontmatter) {
				const listMatch = line.match(/^\s*-\s*(.*)/);
				if (listMatch && currentArrayKey) {
					currentArray.push(listMatch[1].trim());
				} else {
					const match = line.match(/(.*?):\s*(.*)/);
					if (match) {
						const key = match[1].trim();
						const value = match[2].trim();
						if (value === "" && !currentArrayKey) {
							// Start of an array, set current array key
							currentArrayKey = key;
						} else if (value.startsWith("-") && currentArrayKey) {
							// Inside an array, add item to array
							currentArray.push(value.substr(1).trim());
						} else {
							// Regular key-value pair or end of array
							if (currentArrayKey) {
								// End of array, store array and reset variables
								frontmatter[currentArrayKey] = currentArray;
								currentArrayKey = null;
								currentArray = [];
							}
							// Add regular key-value pair to frontmatter object
							frontmatter[key] = value;
						}
					}
				}
			}
		}
		

		// Check if there is an array still being parsed
		if (currentArrayKey) {
			// Store the array in frontmatter
			frontmatter[currentArrayKey] = currentArray;
		}

		return frontmatter;
	}

	private updateFrontmatter(content: string, frontmatter: Record<string, string | string[]>): string {
		let newContent = content.replace(/^---([\s\S]*?)---/, (match, group) => {
			const newFrontmatter = Object.entries(frontmatter)
				.map(([key, value]) => {
					if (Array.isArray(value)) {
						// Format array properly
						return `${key}:\n${value.map(item => `  - ${item}`).join("\n")}`;
					} else {
						return `${key}: ${value}`;
					}
				})
				.join("\n");
			return `---\n${newFrontmatter}\n---`;
		});
		return newContent;
	}

	private updateContent(
		content: string,
		frontmatter: Record<string, string | string[]>,
		channelName: string,
		videoTitle: string,
		videoThumbnailURL: string,
		videoPublishedAt: string,
		channelId: string,
		defaultAudioLanguage: string,
		description: string,
		videoTags: string[]
	): string {
		let newContent = "";

		if (Object.keys(frontmatter).length === 0) {
			let frontmatter = `---`;
			if (this.settings.includeChannel) frontmatter += `\nchannel: ${channelName}`;
			if (this.settings.includeTitle) frontmatter += `\ntitle: ${videoTitle}`;
			if (this.settings.includeThumbnailURL) frontmatter += `\nthumbnail url: ${videoThumbnailURL}`;
			if (this.settings.includePublishedAt) frontmatter += `\npublished at: ${videoPublishedAt}`;
			if (this.settings.includeChannelId) frontmatter += `\nchannelId: ${channelId}`;
			if (this.settings.includeDefaultAudioLanguage) frontmatter += `\ndefaultAudioLanguage: ${defaultAudioLanguage}`;
			if (this.settings.includeDescription) {
				if (this.settings.formatDescriptionToOneLine) {
					description = description.replace(/\n/g, " ");
				}
				frontmatter += `\ndescription: ${description}`;
			}

			if (this.settings.includeVideoTags) frontmatter += `\nvideoTags:\n${videoTags.map(tag => `  - ${tag}`).join("\n")}`;
			newContent = frontmatter + `\n---\n${content}`;
		} else {
			if (this.settings.includeChannel) frontmatter["channel"] = channelName;
			if (this.settings.includeTitle) frontmatter["title"] = videoTitle;
			if (this.settings.includeThumbnailURL) frontmatter["thumbnail url"] = videoThumbnailURL;
			if (this.settings.includePublishedAt) frontmatter["published at"] = videoPublishedAt;
			if (this.settings.includeChannelId) frontmatter["channelId"] = channelId;
			if (this.settings.includeDefaultAudioLanguage) frontmatter["defaultAudioLanguage"] = defaultAudioLanguage;
			if (this.settings.includeDescription) {
				if (this.settings.formatDescriptionToOneLine) {
					description = description.replace(/\n/g, " ");
				}
				frontmatter["description"] = description;
			}
			if (this.settings.includeVideoTags) frontmatter["videoTags"] = videoTags;
			newContent = this.updateFrontmatter(content, frontmatter);
		}

		return newContent;
	}

	private async getVideoDetails(videoId: string, apiKey: string): Promise<string[]> {
		const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`);
		const snippet = response.data.items[0].snippet;
		
		return [
			snippet.channelTitle,
			snippet.title,
			snippet.thumbnails.high.url,
			snippet.publishedAt,
			snippet.channelId,
			snippet.defaultAudioLanguage,
			snippet.description,
			snippet.tags || [], // Ensure tags exist, if not, provide an empty array
		];
	}
}
