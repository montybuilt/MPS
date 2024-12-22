import bcrypt

thang = 'dbeaver'

print(bcrypt.hashpw(thang.encode('utf-8'), bcrypt.gensalt()))