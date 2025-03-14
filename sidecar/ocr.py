from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
from doctr.models import ocr_predictor
from embedding import embed_txt
from PIL import Image


device = (
    "mps"
    if torch.backends.mps.is_available()
    else ("cuda" if torch.cuda.is_available() else "cpu")
)

# Load doctr model
ocr_model = ocr_predictor(
    "db_mobilenet_v3_large", "crnn_mobilenet_v3_large", pretrained=True
)
ocr_model.to(device)


def process_image(image_path):
    """Load an image and convert it to a format usable by Doctr."""
    image = Image.open(image_path)
    image = np.array(image)
    if image.shape[-1] == 4:  # Convert RGBA to RGB
        image = image[:, :, :3]
    if len(image.shape) == 2:  # Convert grayscale to RGB
        image = np.stack([image] * 3, axis=-1)
    return image


def process_page(page, OCR_threshold=0.5):
    """Extract text from a single OCR-processed page with confidence filtering."""
    print(page)
    blocks = page.blocks
    try:
        text = " ".join(
            word.value
            for block in blocks
            for line in block.lines
            for word in line.words
            if word.confidence > OCR_threshold
        )
    except:
        text = None

    if text == "" or (
        text is not None
        and (not any(char.isalpha() for char in text) or len(text) < 3)
        or all(len(word) == 1 for word in text.split() if word.isalpha())
    ):
        text = None
    return text


def extract_text_from_images(image_paths, OCR_threshold=0.5):
    """Apply Doctr OCR model on images and extract text."""
    with ThreadPoolExecutor() as executor:
        images = list(executor.map(process_image, image_paths))

    results = ocr_model(images)  # Run OCR on all images

    with ThreadPoolExecutor() as executor:
        texts = list(executor.map(lambda p: process_page(p, OCR_threshold), results.pages))

    return texts  # Returns a list of extracted texts (None if no text was found)


def embed_ocr_text(image_path):
    """Extract text from an image and generate an embedding using CLIP."""
    extracted_texts = extract_text_from_images([image_path])
    extracted_text = extracted_texts[0] if extracted_texts else None
    if extracted_text:
        return extracted_text  # Generate CLIP text embedding
    return None  # Return None if no text is detected