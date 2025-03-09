import os
import time
import shutil
import subprocess

# Configure folder paths
images_dir = r"D:\Code\Arduino\Projects\automatic-python-image-uploader\images"
uploads_dir = r"D:\Code\Arduino\Projects\automatic-python-image-uploader\uploads"
upload_url = "https://projects.benax.rw/f/o/r/e/a/c/h/p/r/o/j/e/c/t/s/4e8d42b606f70fa9d39741a93ed0356c/iot_testing_202501/upload.php"

# Ensure the uploaded folder exists
os.makedirs(uploads_dir, exist_ok=True)

# Ensure the images folder exists
if not os.path.exists(images_dir):
    print(f"Error: The folder {images_dir} does not exist. Please create it and try again.")
    exit(1)

def upload_image(img_url):
    try:
        response = subprocess.run(
            ["curl", "-X", "POST", "-F", f"imageFile=@{img_url}", upload_url],
            capture_output=True,
            text=True
        )
        if response.returncode == 0:
            print(f"Image successfully uploaded!!!")
            return True
        else:
            print(f"SYSTEM FAILURE!!!, {response.stderr}")
            return False
    except Exception as e:
        print(f"Something went wrong during upload!!! {e}")
        return False
    
def upload_file():
    while True:
        files = [f for f in os.listdir(images_dir) if os.path.isfile(os.path.join(images_dir, f))]
        for file in files:
            file_path = os.path.join(images_dir, file)
            print(f"Waiting for 30 seconds before uploading another image...")
            time.sleep(30)
            if upload_image(file_path):
                shutil.move(file_path, os.path.join(uploads_dir, file))
                print(f"Moved the image to {uploads_dir}")
        time.sleep(10)

if __name__ == "__main__":
    upload_file()
