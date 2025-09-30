import os
import shutil
from pathlib import Path

# Source folder where all your files are now
BASE_DIR = Path("EMIS INTERVIEW QUESTIONS")

def arrange_files():
    if not BASE_DIR.exists():
        print(f"❌ Folder not found: {BASE_DIR}")
        return

    for file in BASE_DIR.iterdir():
        if file.is_file():
            # Get base name without extension
            name = file.stem.upper()  # uppercase for consistency
            ext = file.suffix

            # Detect subject name by splitting before "QUESTION" or "ANSWER"
            if "QUESTION" in name:
                subject = name.split("QUESTION")[0].strip()
            elif "QUESTIONS" in name:
                subject = name.split("QUESTIONS")[0].strip()
            elif "ANSWER" in name:
                subject = name.split("ANSWER")[0].strip()
            elif "ANSWERS" in name:
                subject = name.split("ANSWERS")[0].strip()
            else:
                # Skip unrecognized files
                print(f"⚠️ Skipping {file.name} (no QUESTION/ANSWER keyword)")
                continue

            # Clean up subject name
            subject = subject.strip().replace(" ", "_")

            # Create subject folder
            subject_dir = BASE_DIR / subject
            subject_dir.mkdir(exist_ok=True)

            # Move file into folder
            dest = subject_dir / file.name
            print(f"📂 Moving {file.name} → {subject_dir}/")
            shutil.move(str(file), str(dest))

    print("✅ Arrangement complete!")

if __name__ == "__main__":
    arrange_files()
