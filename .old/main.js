window.onload = () => {
        
    // Import the fetch client and initalize it
    const conn = new streamFetch('https://raw.githubusercontent.com/sbamboo/theaxolot77/main/storage/chibits/3bed3810-7b70-4dce-9097-d3f228782b1d.json');

    // Grab the DOM elements
    const progressbar = document.getElementById('progress-bar');
    const progressbutton = document.getElementById('fetch-button');
    const progresslabel = document.getElementById('progress-label');

    const setProgressbarValue = (payload) => {
        const { received, length, loading } = payload;
        const value = ((received / length) * 100).toFixed(2);
        progresslabel.textContent = `Download progress: ${value}% (Prog: ${received}/${length}, Active: ${loading})`;
        progressbar.value = value;
    };

    // Bind the fetch function to the button's click event
    progressbutton.addEventListener('click', async () => {
        const results = await conn.json();
        console.log(results);
    });

    window.addEventListener('fetch-progress', (e) => {
        setProgressbarValue(e.detail);
    });

    window.addEventListener('fetch-finished', (e) => {
        setProgressbarValue(e.detail);
    });

};