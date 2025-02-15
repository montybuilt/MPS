import bcrypt

password = 'amontanus'

hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

h_p_hex = hashed_password.hex()

print(hashed_password)
print(h_p_hex)