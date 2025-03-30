// ProgressDrop is written by Simon Kalmi Claesson

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
        this.completed = false;

        // Create DOM elements
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = "progressdrop_container";
        this.progressContainer.style.width = '100%';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progressdrop_bar';
        this.progressBar.style.width = '0%';
    
        if (name || showProgress) {
            this.metaContainer = document.createElement('div');
            this.metaContainer.className = 'progressdrop_meta';
            
            this.operationText = document.createElement('p');
            this.operationText.textContent = name;
            
            this.percentageText = document.createElement('p');
            this.percentageText.textContent = showProgress ? '0%' : '';
            
            this.metaContainer.appendChild(this.operationText);
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
     * Updates the progress without changing the current value
     */
    updateSameValue() {
        this.update(this.currentValue);
    }

    /**
     * Updates the name of the progressbar
     */
    updateName(name) {
        if (this.metaContainer) {
            this.operationText.textContent = name;
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
     * Completes without removing the progress bar
     */
    complete() {
        this.completed = true;
        this.update(this.end);
    }

    /**
     * Resets the progress bar
     */
    reset() {
        this.completed = false;
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
     * Removes the progressbar
     */
    remove() {
        this.completed = true;
        this.progressContainer.remove();
    }

    /**
     * Returns the methods that is needed to controll the progress bar
     */
    getMethods() {
        return {
            update: (value) => this.update(value),
            updateSameValue: () => this.updateSameValue(),
            updateName: (name) => this.updateName(name),
            progress: (amount) => this.progress(amount),
            complete: () => this.complete(),
            reset: () => this.reset(),
            cleanUp: () => this.cleanUp(),
            remove: () => this.remove(),
            _obj_: this,
        }
    }
}

/**
* ProgressLoader class for handling progress bars and loading animations
* Supports file downloads, zip operations, and time-based progress updates
*/
class ProgressLoader {
/**
 * Creates a new ProgressLoader instance
 * @param {HTMLElement} parentElement - Container element for progress bars
 */
    constructor(parentElement) {
        this.parentElement = parentElement;
        this.progressBars = [];
    }

    /**
     * Goes trough all progress bars created by the ProgressLoader instance, and calls .cleanUp() on them
     */
    cleanUpAll() {
        this.progressBars.forEach((bar) => {
            bar.cleanUp();
        });
    }

    /**
     * Goes trough all progress bars created by the ProgressLoader instance, and calls .remove() on them
     */
    removeAll() {
        this.progressBars.forEach((bar) => {
            bar.remove();
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
    async fetch(url, name=null, showProgress=true, autoClean=true, safeNoBody=false, yieldProgress=false) {
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
    
        const out_response = new Response(stream);
        if (yieldProgress === true) {
            out_response._progressdrop_obj_ = progress;
            out_response.getProgressObj = ()=>{return progress};
        }
        return out_response;
    }

    /**
     * Unzips a blob with progress tracking
     * @param {Blob} zipBlob - Zip file as blob
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Object>} Extracted files as an object, where keys are filenames and values are Blobs
     */
    async unzip(zipBlob, name=null, showProgress=true, autoClean=true, yieldProgress=false) {
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

        if (yieldProgress === true) {
            result._progressdrop_obj_ = progress;
            result.getProgressObj = ()=>{return progress};
        }
        return result;
    }

    /**
     * Creates a zip file with progress tracking
     * @param {Object} blobs - Files to zip, where keys are filenames and values are Blobs or ArrayBuffers
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Blob>} Zipped file as blob
     */
    async zip(blobs, name=null, showProgress=true, autoClean=true, yieldProgress=false) {
        const progressName = name ? name : 'Zipping...';
        const progress = this.createProgressBar(progressName, showProgress);
        
        const zip = new JSZip();
        
        const entries = Object.entries(blobs);
        const total = entries.length;
        let processed = 0;
    
        // Process files
        progress.updateName(progressName + "(Adding files)")
        for (const [filename, blob] of entries) {
            zip.file(filename, blob);
            processed++;
            progress.update((processed / total) * 100);
        }
    
        // Write blob
        if (showProgress) {
            progress.reset();
            progress.updateName(progressName + "(Writing blob)");
        }
        const out_response = await zip.generateAsync(
            {type: 'blob'},
            showProgress ? (p) => { progress.update(p); } : undefined
        );
    
        // Auto clean?
        if (autoClean) {
            progress.cleanUp();
        } else {
            progress.complete();
        }
     
        // Yield progess?
        if (yieldProgress === true) {
            out_response._progressdrop_obj_ = progress;
            out_response.getProgressObj = ()=>{return progress};
        }
        return out_response;
    }

    /**
     * Extracts files from a tar blob with progress tracking
     * @param {Blob} tarBlob - Tar file as a blob
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Object>} Extracted files as an object, where keys are filenames and values are Blobs
     */
    async untar(tarBlob, name=null, showProgress=true, autoClean=true, yieldProgress=false) {
        const progressName = name ? name : "Extracting Tar...";
        const progress = this.createProgressBar(progressName, showProgress);

        const arrayBuffer = await tarBlob.arrayBuffer();
        const tarReader = new tarball.TarReader();
        const fileInfo = tarReader.readArrayBuffer(arrayBuffer);

        const result = {};
        const total = fileInfo.length;
        let processed = 0;

        for (const file of fileInfo) {
            const blob = tarReader.getFileBlob(file.name);
            result[file.name] = blob;
            processed++;
            progress.update((total / processed) * 100);
        }

        if (autoClean) {
            progress.cleanUp();
        } else {
            progress.complete();
        }

        if (yieldProgress === true) {
            result._progressdrop_obj_ = progress;
            result.getProgressObj = ()=>{return progress};
        }

        return result;
    }  
 
    /**
     * Creates a tar file with progress tracking
     * @param {Object} blobs - Files to tar, where keys are filenames and values are Blobs or ArrayBuffers
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<Blob>} Tar file as blob
     */
    async tar(blobs, name=null, showProgress=true, autoClean=true, yieldProgress=false) {
        const progressName = name ? name : "Creating Tar...";
        const progress = this.createProgressBar(progressName, showProgress);
    
        const tarWriter = new tarball.TarWriter();
        
        const entries = Object.entries(blobs);
        const total = entries.length;
        let processed = 0;
    
        // Process files
        progress.updateName(progressName + "(Adding files)")
        for (const [filename, fileData] of entries) {
            if (fileData instanceof Blob) {
                tarWriter.addFile(filename, fileData);
            } else if (fileData instanceof ArrayBuffer) {
                tarWriter.addFileArrayBuffer(filename, fileData);
            } else {
                throw new Error(
                    "Unsupported file type.  Values must be Blob or ArrayBuffer."
                );
            }

            processed++;
            progress.update((processed / total) * 100);
        }
    
        // Write blob
        if (showProgress) {
            progress.reset();
            progress.updateName(progressName + "(Writing blob)");
        }
        const out_response = await tarWriter.writeBlob(
            showProgress ? (p) => { progress.update(p); } : undefined
        );
    
        // Auto clean?
        if (autoClean) {
            progress.cleanUp();
        } else {
            progress.complete();
        }
     
        // Yield progess?
        if (yieldProgress === true) {
            out_response._progressdrop_obj_ = progress;
            out_response.getProgressObj = ()=>{return progress};
        }
        return out_response;
    }

    /**
     * Creates a time-based progress bar that updates at specified intervals
     * @param {number} milliseconds - Total duration in milliseconds
     * @param {number} updateDelay - Update interval in milliseconds
     * @param {string} name - Operation name (optional)
     * @param {boolean} showProgress - Whether to show percentage
     * @returns {Promise<void>}
     */
    async timeDelay(milliseconds, updateDelay, name=null, showProgress=true, autoClean=true, yieldProgress=false) {
        const progressName = name ? name : 'Processing...';
        const progress = this.createProgressBar(progressName, showProgress, 0, milliseconds);
        
        const startTime = Date.now();
        const endTime = startTime + milliseconds;
    
        const out_response = new Promise((resolve) => {
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

        if (yieldProgress === true) {
            out_response._progressdrop_obj_ = progress;
            out_response.getProgressObj = ()=>{return progress};
        }
        return out_response;
    }
}