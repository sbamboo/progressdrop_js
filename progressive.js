/**
 * Represents a single progress bar UI component
 */
class ProgressBar {
    /**
     * Creates a new progress bar
     * @param {HTMLElement} container - Container element
     * @param {string} name - Operation name
     * @param {boolean} showProgress - Whether to show percentage
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     */
    constructor(container, name="", showProgress=true, start=0, end=100) {
        this.start = start;
        this.end = end;
        this.currentValue = start;
        this.container = container;
        this.showProgress = showProgress;

        // Create DOM elements
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = "progressive_container";
        this.progressContainer.style.width = '100%';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progressive_bar';
        this.progressBar.style.width = '0%';
    
        if (name || showProgress) {
            this.metaContainer = document.createElement('div');
            this.metaContainer.className = 'progressive_meta';
            
            const operationText = document.createElement('p');
            operationText.textContent = name;
            
            this.percentageText = document.createElement('p');
            this.percentageText.textContent = showProgress ? '0%' : '';
            
            this.metaContainer.appendChild(operationText);
            this.metaContainer.appendChild(this.percentageText);
            this.progressContainer.appendChild(this.metaContainer);
        }
    
        this.progressContainer.appendChild(this.progressBar);
        container.appendChild(this.progressContainer);
    }

    /**
     * Calculates percentage based on current value and range
     * @returns {number} Percentage complete
     */
    calculatePercentage() {
        const range = this.end - this.start;
        const current = this.currentValue - this.start;
        return (current / range) * 100;
    }

    /**
     * Updates the progress bar to a specific value
     * @param {number} value - Current value between start and end
     */
    update(value) {
        this.currentValue = Math.max(this.start, Math.min(this.end, value));
        const percentage = this.calculatePercentage();
        this.progressBar.style.width = `${percentage}%`;
        
        if (this.showProgress && this.metaContainer) {
            this.percentageText.textContent = `${Math.round(percentage)}%`;
        }
    }

    /**
     * Increments the current value and updates the progress bar
     * @param {number} amount - Amount to increment
     */
    progress(amount) {
        this.update(this.currentValue + amount);
    }

    /**
     * Completes and removes the progress bar
     */
    complete() {
        this.update(this.end);
    }

    /**
     * Resets the progress bar
     */
    reset() {
        this.update(this.start);
    }

    /**
     * Completes and removes the progress bar
     */
    cleanUp() {
        this.complete();
        setTimeout(() => {
            this.progressContainer.remove();
        }, 500);
    }

    /**
     * Returns the methods that is needed to controll the progress bar
     */
    getMethods() {
        return {
            update: (value) => this.update(value),
            progress: (amount) => this.progress(amount),
            complete: () => this.complete(),
            reset: () => this.reset(),
            cleanUp: () => this.cleanUp(),
            _obj_: this,
        }
    }
    }

    /**
    * ProgressiveLoader class for handling progress bars and loading animations
    * Supports file downloads, zip operations, and time-based progress updates
    */
    export class ProgressiveLoader {
    /**
     * Creates a new ProgressiveLoader instance
     * @param {HTMLElement} parentElement - Container element for progress bars
     */
    constructor(parentElement) {
        this.parentElement = parentElement;
        this.progressBars = [];
    }

    /**
     * Goes trough all progress bars created by the ProgressiveLoader instance, and calls .cleanUp() on them
     */
    cleanUpAll() {
        this.progressBars.forEach((bar) => {
            bar.cleanUp();
        });
    }

    /**
     * Creates and returns a progress bar component
     * @param {string} name - Operation name to display (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @returns {Object} Progress bar control methods
     */
    createProgressBar(name="", showProgress=true, start=0, end=100) {
        const progressBar = new ProgressBar(this.parentElement, name, showProgress, start, end);
        this.progressBars.push(progressBar);
        return progressBar.getMethods();
    }

    /**
     * Fetches a file with progress tracking
     * @param {string} url - URL to fetch
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Response>} Fetch response
     */
    async fetch(url, name=null, showProgress=true, autoClean=true, safeNoBody=false) {
        const progressName = name ? name : 'Downloading...';
        const progress = this.createProgressBar(progressName, showProgress);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        if (!response.body) {
            if (safeNoBody) {
                return response;
            }
            throw new Error('ReadableStream not supported');
        }
    
        const reader = response.body.getReader();
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;
    
        const stream = new ReadableStream({
            start: async (controller) => {
                while (true) {
                    const {done, value} = await reader.read();
                    
                    if (done) {
                        if (autoClean) {
                            progress.cleanUp();
                        } else {
                            progress.complete();
                        }
                        controller.close();
                        break;
                    }
            
                    loaded += value.length;
                    progress.update((loaded / total) * 100);
                    
                    controller.enqueue(value);
                }
            }
        });
    
        return new Response(stream);
    }

    /**
     * Unzips a blob with progress tracking
     * @param {Blob} zipBlob - Zip file as blob
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Object>} Extracted files
     */
    async unzip(zipBlob, name=null, showProgress=true, autoClean=true) {
        const progressName = name ? name : 'Unzipping...';
        const progress = this.createProgressBar(progressName, showProgress);
        
        const zip = new JSZip();
        
        const zipContent = await zip.loadAsync(zipBlob, {
            async: true,
            support: {
                arraybuffer: true
            }
        });
    
        const files = Object.keys(zipContent.files);
        const total = files.length;
        let processed = 0;
    
        const result = {};
        for (const filename of files) {
            const file = zipContent.files[filename];
            if (!file.dir) {
                result[filename] = await file.async('blob');
            }
            processed++;
            progress.update((processed / total) * 100);
        }
    
        if (autoClean) {
            progress.cleanUp();
        } else {
            progress.complete();
        }
        return result;
    }

    /**
     * Creates a zip file with progress tracking
     * @param {Object} blobs - Files to zip
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Blob>} Zipped file as blob
     */
    async zip(blobs, name=null, showProgress=true, autoClean=true) {
        const progressName = name ? name : 'Zipping...';
        const progress = this.createProgressBar(progressName, showProgress);
        
        const zip = new JSZip();
        
        const entries = Object.entries(blobs);
        const total = entries.length;
        let processed = 0;
    
        for (const [filename, blob] of entries) {
            zip.file(filename, blob);
            processed++;
            progress.update((processed / total) * 100);
        }
    
        if (autoClean) {
            progress.cleanUp();
        } else {
            progress.complete();
        }
        return await zip.generateAsync({type: 'blob'});
    }

    /**
     * Creates a time-based progress bar that updates at specified intervals
     * @param {number} milliseconds - Total duration in milliseconds
     * @param {number} updateDelay - Update interval in milliseconds
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<void>}
     */
    async timeDelay(milliseconds, updateDelay, name=null, showProgress=true, autoClean=true) {
        const progressName = name ? name : 'Processing...';
        const progress = this.createProgressBar(progressName, showProgress, 0, milliseconds);
        
        const startTime = Date.now();
        const endTime = startTime + milliseconds;
    
        return new Promise((resolve) => {
            const updateProgress = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                
                progress.update(elapsed);
        
                if (currentTime < endTime) {
                    setTimeout(updateProgress, updateDelay);
                } else {
                    if (autoClean) {
                        progress.cleanUp();
                    } else {
                        progress.complete();
                    }
                    resolve();
                }
            };
        
            updateProgress();
        });
    }
}