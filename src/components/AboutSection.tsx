import { T } from "./T";

export const AboutSection = () => {
  return (
    <section className="py-12 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-bold text-primary">
            <T zh="关于 JJ Emas" en="About JJ Emas" />
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <T 
              zh="欢迎来到 JJ Emas，马来西亚值得信赖的优质黄金珠宝来源。我们专注于916和999金产品，提供精湛的工艺和永恒的设计。凭借数十年的黄金珠宝行业经验，我们以为每位客户提供卓越的质量、有竞争力的价格和个性化的服务而自豪。我们收藏的每一件作品都经过精心挑选和制作，为您所有特殊时刻带来最优质的黄金珠宝。"
              en="Welcome to JJ Emas, Malaysia's trusted source for premium gold jewelry. We specialize in 916 and 999 gold pieces, offering exquisite craftsmanship and timeless designs. With decades of experience in the gold jewelry industry, we pride ourselves on delivering exceptional quality, competitive pricing, and personalized service to every customer. Each piece in our collection is carefully selected and crafted to bring you the finest gold jewelry for all your special moments."
            />
          </p>
        </div>
      </div>
    </section>
  );
};
