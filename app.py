import os

def create_structure():
    # ဖန်တီးရမည့် နေရာများ (Directories)
    directories = [
        "content/attire/my/history",
        "content/attire/my/ethnic",
        "content/attire/my/elements",
        "schemas",
        ".github/workflows"
    ]

    # ဖန်တီးရမည့် ဗလာဖိုင်များ (Empty Files)
    files = {
        "schemas/attire-schema.json": "",
        ".github/workflows/validate-content.yml": "",
        "README.md": "",
        "LICENSE": ""
    }

    print("🚀 dhalay repository structure ကို စတင်ဖန်တီးနေပါပြီ...")

    # Folder များကို ဖန်တီးခြင်း
    for dir_path in directories:
        os.makedirs(dir_path, exist_ok=True)
        # Git က ဗလာ folder များကို သိမ်းဆည်းနိုင်ရန် .gitkeep ထည့်ပေးခြင်း
        gitkeep_path = os.path.join(dir_path, ".gitkeep")
        with open(gitkeep_path, "w", encoding="utf-8") as f:
            pass

    # လိုအပ်သော ဖိုင်များကို ဖန်တီးခြင်း
    for file_path, content in files.items():
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

    print("✨ အောင်မြင်စွာ ဖန်တီးပြီးစီးပါပြီ!")

if __name__ == "__main__":
    create_structure()