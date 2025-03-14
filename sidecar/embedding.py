import clip
import torch


device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)


def embed(img):
    image = preprocess(img).unsqueeze(0).to(device)
    embs = model.encode_image(image)
    return embs.detach().cpu().numpy()[0].tolist()

def embed_txt(txt):
    text = clip.tokenize([txt]).to(device)
    embs = model.encode_text(text)
    return embs.detach().cpu().numpy()[0].tolist()