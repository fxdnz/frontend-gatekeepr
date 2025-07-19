// Frontend JavaScript for handling driver's license processing and visitor submission

// Hardcoded Gemini AI API key (NOT RECOMMENDED FOR PRODUCTION)
const GEMINI_API_KEY = 'AIzaSyAhFjdWTmnlrR-Zx86MrqKESnAcvSzjeGw';

// Gemini API Endpoint (using a stable vision model)
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// The authentication token for your backend API, as provided previously
const BACKEND_AUTH_TOKEN = '19964e266cf5296192cef231cf238839e9a9cc45'; //

// Global variable to store extracted driver's license data
let currentExtractedLicenseData = {};

// Get a reference to the loading spinner
const loadingSpinner = document.getElementById('loadingSpinner');

// Function to convert an image file to a Base64 string
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // Extract base64 data
        reader.onerror = error => reject(new Error('Failed to read image file: ' + error.message));
        reader.readAsDataURL(file);
    });
}

// Function to send image to Gemini API for OCR and extract information
async function extractDriverLicenseInfo(base64Image, mimeType) {
    const prompt = 'Extract the following information from this Philippine driver\'s license image: last_name, first_name, middle_name, sex, home_address, license_number. Return the response in JSON format.';

    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    },
                    {
                        text: prompt
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API request failed: ${response.status} - ${response.statusText}. Details: ${errorBody}`);
        }

        const data = await response.json();
        console.log('Raw Gemini Response:', data);

        // Attempt to parse the JSON response from Gemini
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            try {
                // Gemini might return markdown, so extract the JSON part
                const textResponse = data.candidates[0].content.parts[0].text.trim();
                const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    return JSON.parse(jsonMatch[1]);
                } else {
                    // If no markdown, try to parse directly
                    return JSON.parse(textResponse);
                }
            } catch (parseError) {
                console.error('Failed to parse Gemini response as JSON:', parseError);
                // Fallback: return raw text if JSON parsing fails
                return { raw_gemini_response: data.candidates[0].content.parts[0].text };
            }
        } else {
            console.warn('Unexpected Gemini response structure or no text content:', data);
            return { error: 'No recognizable content from Gemini API.' };
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error; // Re-throw to be caught by the calling function
    }
}

// Function to display extracted data on the frontend
function displayExtractedData(data) {
    const outputDiv = document.getElementById('output');
    if (!outputDiv) {
        console.error('Output div not found!');
        return;
    }

    let html = '<h2>Extracted Driver\'s License Information:</h2>';
    if (data.error) {
        html += `<p style="color: red;"><strong>Error:</strong> ${data.error}</p>`;
    } else if (data.raw_gemini_response) {
        html += `<p style="color: orange;"><strong>Warning:</strong> Could not parse Gemini response as JSON. Raw text received:</p><pre>${data.raw_gemini_response}</pre>`;
    } else {
        // Construct the full name for display
        const fullName = [data.first_name, data.middle_name, data.last_name]
            .filter(Boolean) // Remove null/undefined/empty parts
            .join(' ');

        html += `<p><strong>Name:</strong> ${fullName}</p>`;
        html += `<p><strong>Drivers license:</strong> ${data.license_number || 'N/A'}</p>`;
        html += `<p><strong>Address:</strong> ${data.home_address || 'N/A'}</p>`;
        // Plate number and Purpose are manual inputs, so they are not displayed here.
    }
    outputDiv.innerHTML = html;
}

// Function to show the visitor input form
function showInputForm(initialData = {}) {
    const formDiv = document.getElementById('inputForm');
    if (!formDiv) {
        console.error('Input form div not found!');
        return;
    }

    // Only include inputs for plate number and purpose of visit as requested
    formDiv.innerHTML = `
        <h2>Visitor Details:</h2>
        <label for="plateNumber">Plate number:</label><br>
        <input type="text" id="plateNumber" name="plateNumber" value="${initialData.plate_number || ''}" placeholder="e.g., ABC 1234"><br><br>

        <label for="visitPurpose">Purpose:</label><br>
        <input type="text" id="visitPurpose" name="visitPurpose" value="${initialData.purpose || ''}" required placeholder="e.g., Delivery, Meeting"><br><br>

        <button type="button" onclick="submitVisitorData()">Register Visitor</button>
    `;
}

// Main function to handle driver's license processing
async function processDriverLicense() {
    const fileInput = document.getElementById('licenseFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file.');
        return;
    }

    // Clear previous outputs and show spinner
    document.getElementById('output').innerHTML = '';
    document.getElementById('inputForm').innerHTML = '';
    loadingSpinner.style.display = 'block'; // Show the spinner

    try {
        // Basic file type validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (e.g., JPG, PNG).');
            loadingSpinner.style.display = 'none'; // Hide spinner on error
            return;
        }

        const base64Image = await convertImageToBase64(file);
        const extractedData = await extractDriverLicenseInfo(base64Image, file.type);

        // Store extracted data globally after processing
        currentExtractedLicenseData = { ...extractedData }; // Make a copy

        displayExtractedData(extractedData);
        showInputForm(); // Show the input form

    } catch (error) {
        console.error('Error in processDriverLicense:', error);
        alert(`An error occurred during license processing: ${error.message}`);
    } finally {
        loadingSpinner.style.display = 'none'; // Always hide the spinner
    }
}

// Function to handle form submission to backend
// eslint-disable-next-line no-unused-vars
async function submitVisitorData() {
    // Get manual inputs
    const plateNumber = document.getElementById('plateNumber').value.trim();
    const visitPurpose = document.getElementById('visitPurpose').value.trim();

    // Basic validation for required fields from user input
    if (!visitPurpose) {
        alert('Please fill in "Purpose".');
        return;
    }

    // Construct the full name from extracted data
    const fullName = [
        currentExtractedLicenseData.first_name,
        currentExtractedLicenseData.middle_name,
        currentExtractedLicenseData.last_name
    ].filter(Boolean).join(' ');

    // Prepare data for the backend, matching the Django Visitor model structure
    const visitorData = {
        name: fullName, // Matches Django 'name' field
        drivers_license: currentExtractedLicenseData.license_number || '', // Matches Django 'drivers_license' field
        address: currentExtractedLicenseData.home_address || '', // Matches Django 'address' field
        plate_number: plateNumber, // Manually inputted, matches Django 'plate_number' field
        purpose: visitPurpose, // Manually inputted, matches Django 'purpose' field
        // 'timestamp' is handled by Django's auto_now_add=True
    };

    // Remove any temporary/error fields if they exist from the OCR step
    delete visitorData.error;
    delete visitorData.raw_gemini_response;

    console.log('Sending to backend:', visitorData);

    try {
        const response = await fetch('https://gatekeepr-backend.onrender.com/api/v1/visitors/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Incorporating the Authorization header logic from your axios example
                'Authorization': `Token ${BACKEND_AUTH_TOKEN}` //
            },
            body: JSON.stringify(visitorData)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Backend request failed: ${response.status} - ${response.statusText}. Details: ${errorBody}`);
        }

        const result = await response.json();
        console.log('Backend Response:', result);
        alert('Visitor data registered successfully!');
        // Clear forms after successful submission
        document.getElementById('licenseFile').value = ''; // Clear file input
        document.getElementById('output').innerHTML = '';
        document.getElementById('inputForm').innerHTML = '';

    } catch (error) {
        console.error('Error submitting visitor data:', error);
        alert(`Failed to register visitor data: ${error.message}`);
    }
}

// Event listener for initial driver's license form submission
document.addEventListener('DOMContentLoaded', () => {
    const licenseForm = document.getElementById('licenseForm');
    if (licenseForm) {
        licenseForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default form submission
            processDriverLicense();
        });
    } else {
        console.error('License form (ID: licenseForm) not found in the DOM.');
    }
});                                                                                           